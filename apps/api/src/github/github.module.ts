import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { CodeIssue, Finding, Severity, SystemGraph } from '@riscly/shared';
import { planLimits } from '@riscly/shared';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from '../auth/audit.service';
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
    repo: i.repo,
  };
}

class CodeFixDto {
  @IsOptional() @IsString() repo?: string;
  @IsString() file!: string;
  @IsOptional() @IsInt() @Min(1) line?: number;
  @IsOptional() @IsInt() @Min(1) endLine?: number;
  @IsString() rule!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  /** The exact fixed file content the user already previewed and verified. When
   *  present, apply/PR commit THIS verbatim instead of re-running the AI — so
   *  what gets pushed is exactly what was reviewed (and the push can't silently
   *  no-op if a second generation comes back empty). */
  @IsOptional() @IsString() content?: string;
}

@Controller('projects/:projectId')
class GithubController {
  constructor(
    private readonly github: GithubService,
    private readonly store: Store,
    private readonly billing: BillingService,
    private readonly ai: PredictionService,
    private readonly analyze: AnalyzeService,
    private readonly audit: AuditService,
  ) {}

  /** Resolve the repo to act on: the one given, else the project's first repo. */
  private async resolveRepo(projectId: string, orgId: string, repo?: string): Promise<string> {
    if (repo) return repo;
    const repos = await this.github.listRepos(projectId, orgId);
    if (!repos[0]) throw new BadRequestException('No connected GitHub repository.');
    return repos[0];
  }

  /** Enforce the plan's monthly AI-fix-generation quota (aiFixesPerMonth).
   *  Unlimited plans (Infinity) short-circuit. Counts this calendar month's
   *  'fix' AI calls for the org. */
  private async assertFixQuota(auth: AuthContext): Promise<void> {
    const limit = planLimits(auth.org.plan).aiFixesPerMonth;
    if (!Number.isFinite(limit)) return;
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    const used = await this.store.countAiUsageSince(auth.org.id, since.toISOString(), 'fix');
    if (used >= limit) {
      throw new HttpException(
        `You've reached your plan's monthly AI-fix limit (${limit}). Upgrade for more.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * The fixed file content to push. Prefer the verified content the user
   * already previewed (so what's committed is exactly what was reviewed);
   * otherwise read the file and generate a fix with the AI as a fallback.
   */
  private async resolveFix(
    projectId: string,
    auth: AuthContext,
    repo: string,
    dto: CodeFixDto,
  ): Promise<{ content: string; explanation: string | null }> {
    if (dto.content != null && dto.content.trim() !== '') {
      return { content: dto.content, explanation: null };
    }
    const original = await this.github.readFile(projectId, auth.org.id, repo, dto.file);
    if (original == null) {
      throw new BadRequestException('Could not read the file from the repo.');
    }
    const result = await this.ai.fixCode(
      {
        file: dto.file,
        content: original,
        line: dto.line ?? 1,
        endLine: dto.endLine,
        rule: dto.rule,
        title: dto.title,
        description: dto.description ?? '',
      },
      { plan: auth.org.plan, ctx: { orgId: auth.org.id, userId: auth.user.id } },
    );
    if (!result.fixed) {
      throw new BadRequestException('Could not generate a fix to apply. The AI may be unavailable.');
    }
    return { content: result.fixed, explanation: result.explanation ?? null };
  }

  /** Generate an AI fix for a located code issue (preview: original + fixed). */
  @Post('code/fix')
  @RequirePermission('project:read')
  async codeFix(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CodeFixDto,
  ) {
    this.billing.assertHasFeature(auth.org, 'aiPredictions', 'AI fix generation');
    await this.assertFixQuota(auth);
    const repo = await this.resolveRepo(projectId, auth.org.id, dto.repo);
    const content = await this.github.readFile(projectId, auth.org.id, repo, dto.file);
    if (content == null) {
      throw new BadRequestException('Could not read the file from the repo.');
    }
    const result = await this.ai.fixCode(
      {
        file: dto.file,
        content,
        line: dto.line ?? 1,
        endLine: dto.endLine,
        rule: dto.rule,
        title: dto.title,
        description: dto.description ?? '',
      },
      { plan: auth.org.plan, ctx: { orgId: auth.org.id, userId: auth.user.id } },
    );
    return { original: content, ...result };
  }

  /**
   * Locate maintainability problems in one file at specific line ranges (Code
   * Quality). Returns issues the UI highlights red — each is then fixed and
   * pushed individually via the windowed code-fix flow, exactly like SAST.
   */
  @Post('code/quality/issues')
  @RequirePermission('project:read')
  async codeQualityIssues(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CodeFixDto,
  ) {
    this.billing.assertHasFeature(auth.org, 'aiPredictions', 'AI maintainability analysis');
    const repo = await this.resolveRepo(projectId, auth.org.id, dto.repo);
    const content = await this.github.readFile(projectId, auth.org.id, repo, dto.file);
    if (content == null) {
      throw new BadRequestException('Could not read the file from the repo.');
    }
    const issues = await this.ai.maintainabilityIssues(dto.file, content, {
      plan: auth.org.plan,
      ctx: { orgId: auth.org.id, userId: auth.user.id },
    });
    return { aiEnabled: this.ai.aiEnabled, issues };
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
    const repo = await this.resolveRepo(projectId, auth.org.id, dto.repo);
    const { content: fixedContent, explanation } = await this.resolveFix(
      projectId,
      auth,
      repo,
      dto,
    );
    const pr = await this.github.openPullRequest(projectId, auth.org.id, {
      path: dto.file,
      content: fixedContent,
      title: `Riscly fix: ${dto.title}`,
      body:
        `Automated fix for **${dto.title}** (\`${dto.rule}\`) in \`${dto.file}\`.\n\n` +
        `${explanation ?? ''}\n\nReview carefully before merging.`,
    });
    void this.audit.record(auth, 'code.fix.pr', { type: 'project', id: projectId }, {
      file: dto.file, rule: dto.rule, repo,
    });
    return pr;
  }

  /** Apply an AI fix by committing it directly to the default branch (no PR). */
  @Post('code/fix/commit')
  @RequirePermission('connection:write')
  async codeFixCommit(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CodeFixDto,
  ) {
    this.billing.assertHasFeature(auth.org, 'prExport', 'AI fix apply');
    const repo = await this.resolveRepo(projectId, auth.org.id, dto.repo);
    const { content: fixedContent } = await this.resolveFix(projectId, auth, repo, dto);
    const commit = await this.github.commitFile(projectId, auth.org.id, {
      repo,
      path: dto.file,
      content: fixedContent,
      message: `Riscly fix: ${dto.title} (${dto.rule})`,
    });
    void this.audit.record(auth, 'code.fix.commit', { type: 'project', id: projectId }, {
      file: dto.file, rule: dto.rule, repo,
    });
    return commit;
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
          ctx: { orgId: auth.org.id, userId: auth.user.id },
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
  imports: [StoreModule, AiModule, AnalyzeModule, AuthModule],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
