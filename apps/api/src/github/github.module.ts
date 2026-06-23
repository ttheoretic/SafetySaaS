import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { CodeIssue, Finding, Severity, SystemGraph } from '@riscly/shared';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { BillingService } from '../billing/billing.service';
import { AiModule } from '../ai/ai.module';
import { PredictionService } from '../ai/prediction.service';
import { AnalyzeModule } from '../analyze/analyze.module';
import { AnalyzeService } from '../analyze/analyze.service';
import { GithubService } from './github.service';
import { buildRemediationMarkdown } from './remediation';

const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|php|java|cs|rs|kt)$/i;
const EXCLUDE_RE =
  /(^|\/)(node_modules|dist|build|out|\.next|\.git|vendor|coverage|__pycache__|migrations|generated)\//;
const MAX_DEEP_SCAN_FILES = 12;

const ISSUE_WEIGHT: Record<Severity, number> = {
  critical: 22,
  high: 14,
  medium: 8,
  low: 3,
};

/** Derive a score/risk finding from a located code issue. */
function findingFromIssue(i: CodeIssue): Finding {
  return {
    category: 'security',
    severity: i.severity,
    title: i.title,
    description: i.description,
    weight: ISSUE_WEIGHT[i.severity],
    rule: i.rule,
    file: i.file,
    line: i.line,
  };
}

class CodeFixDto {
  @IsString() repo!: string;
  @IsString() file!: string;
  @IsOptional() @IsInt() @Min(1) line?: number;
  @IsString() rule!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('projects/:projectId')
class GithubController {
  constructor(
    private readonly github: GithubService,
    private readonly store: Store,
    private readonly billing: BillingService,
    private readonly ai: PredictionService,
    private readonly analyze: AnalyzeService,
  ) {}

  /** Generate an AI fix for a located code issue (preview: original + fixed). */
  @Post('code/fix')
  @RequirePermission('project:read')
  async codeFix(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CodeFixDto,
  ) {
    this.billing.assertHasFeature(auth.org, 'aiPredictions', 'AI fix generation');
    const content = await this.github.readFile(
      projectId,
      auth.org.id,
      dto.repo,
      dto.file,
    );
    if (content == null) {
      throw new BadRequestException('Could not read the file from the repo.');
    }
    const result = await this.ai.fixCode(
      {
        file: dto.file,
        content,
        line: dto.line ?? 1,
        rule: dto.rule,
        title: dto.title,
        description: dto.description ?? '',
      },
      { plan: auth.org.plan },
    );
    return { original: content, ...result };
  }

  /** Apply an AI fix by opening a pull request with the corrected file. */
  @Post('code/fix/pr')
  @RequirePermission('connection:write')
  async codeFixPr(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CodeFixDto,
  ) {
    this.billing.assertHasFeature(auth.org, 'prExport', 'AI PR export');
    const content = await this.github.readFile(
      projectId,
      auth.org.id,
      dto.repo,
      dto.file,
    );
    if (content == null) {
      throw new BadRequestException('Could not read the file from the repo.');
    }
    const result = await this.ai.fixCode(
      {
        file: dto.file,
        content,
        line: dto.line ?? 1,
        rule: dto.rule,
        title: dto.title,
        description: dto.description ?? '',
      },
      { plan: auth.org.plan },
    );
    if (!result.fixed) {
      throw new BadRequestException(
        'Could not generate a fix to apply. The AI may be unavailable.',
      );
    }
    return this.github.openPullRequest(projectId, auth.org.id, {
      path: dto.file,
      content: result.fixed,
      title: `Riscly fix: ${dto.title}`,
      body:
        `Automated fix for **${dto.title}** (\`${dto.rule}\`) in \`${dto.file}\`.\n\n` +
        `${result.explanation ?? ''}\n\nReview carefully before merging.`,
    });
  }

  /**
   * Open a pull request adding a remediation plan (built from the latest scan's
   * findings + recommendations) to the connected repo. Findings are
   * architecture-level, so this lands a reviewed plan rather than editing source.
   */
  @Post('remediation-pr')
  @RequirePermission('connection:write')
  async remediationPr(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
  ) {
    // One-click PR export unlocks on growth+ (matches the pricing table).
    this.billing.assertHasFeature(auth.org, 'prExport', 'AI PR export');
    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded') ?? scans[0];
    if (!latest) {
      throw new BadRequestException('Run a scan first to generate a plan.');
    }
    const markdown = buildRemediationMarkdown(latest);
    return this.github.openPullRequest(projectId, auth.org.id, {
      path: 'RISCLY_REMEDIATION.md',
      content: markdown,
      title: 'Riscly: remediation plan',
      body:
        'Automated remediation plan generated by Riscly from the latest scan. ' +
        'Review the prioritized risks and recommended fixes below.',
    });
  }

  /**
   * Deep AI code analysis: read the project's source files and have the model
   * flag security + quality + correctness issues with line numbers, merged into
   * the latest scan so they show up in the code view. On-demand (cost/latency).
   */
  @Post('code/deep-scan')
  @RequirePermission('connection:write')
  async deepScan(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
  ) {
    this.billing.assertHasFeature(auth.org, 'sast', 'Code analysis');
    this.billing.assertHasFeature(auth.org, 'aiPredictions', 'AI code analysis');

    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded') ?? scans[0];
    if (!latest) throw new BadRequestException('Run a scan first.');

    const repos = await this.github.listRepos(projectId, auth.org.id);
    const repo = repos[0];
    if (!repo) throw new BadRequestException('No connected repository.');

    const files = await this.github.listFiles(projectId, auth.org.id, repo);
    const targets = files
      .map((f) => f.path)
      .filter(
        (p) =>
          SOURCE_RE.test(p) &&
          !EXCLUDE_RE.test(p) &&
          !/\.(min|test|spec)\./i.test(p),
      )
      .slice(0, MAX_DEEP_SCAN_FILES);

    const found: CodeIssue[] = [];
    await Promise.all(
      targets.map(async (path) => {
        const content = await this.github.readFile(
          projectId,
          auth.org.id,
          repo,
          path,
        );
        if (!content) return;
        const issues = await this.ai.analyzeFile(path, content, {
          plan: auth.org.plan,
        });
        const lines = content.split('\n');
        for (const i of issues) {
          found.push({
            id: `ai/${i.rule}:${path}:${i.line}`,
            file: path,
            repo,
            line: i.line,
            endLine: i.endLine,
            rule: i.rule,
            severity: i.severity,
            title: i.title,
            description: i.description,
            snippet: (lines[i.line - 1] ?? '').trim().slice(0, 200),
          });
        }
      }),
    );

    // Merge into the latest scan's graph so the code view picks them up, and
    // recompute the score/findings so the new issues also surface as risks.
    const graph = (latest.graph ?? { nodes: [], edges: [] }) as SystemGraph;
    const existing = graph.codeIssues ?? [];
    const seen = new Set(existing.map((i) => i.id));
    const merged = [...existing, ...found.filter((i) => !seen.has(i.id))];
    const codeFindings = merged.map(findingFromIssue);
    const mergedGraph: SystemGraph = {
      ...graph,
      codeIssues: merged,
      codeFindings,
    };
    const analysis = this.analyze.reliability(mergedGraph);
    await this.store.updateScan(latest.id, {
      graph: mergedGraph,
      reliabilityScore: analysis.score,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
    });

    return {
      added: found.length,
      total: merged.length,
      filesAnalyzed: targets.length,
      aiEnabled: this.ai.aiEnabled,
    };
  }

  /** Recent commits across the project's connected GitHub repos. */
  @Get('commits')
  @RequirePermission('project:read')
  commits(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit) || 10, 1), 30);
    return this.github.listCommits(projectId, auth.org.id, n);
  }

  /** The file tree (blob paths) for a repo, for the code explorer. */
  @Get('files')
  @RequirePermission('project:read')
  async files(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Query('repo') repo?: string,
  ) {
    const repos = await this.github.listRepos(projectId, auth.org.id);
    const target = repo && repos.includes(repo) ? repo : repos[0];
    if (!target) return { repo: null, repos, files: [] };
    const files = await this.github.listFiles(projectId, auth.org.id, target);
    return { repo: target, repos, files };
  }

  /** Raw UTF-8 content of a single file. */
  @Get('files/content')
  @RequirePermission('project:read')
  async fileContent(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Query('repo') repo: string,
    @Query('path') path: string,
  ) {
    const content = await this.github.readFile(
      projectId,
      auth.org.id,
      repo,
      path,
    );
    return { repo, path, content };
  }
}

@Module({
  imports: [StoreModule, AiModule, AnalyzeModule],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
