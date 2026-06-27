import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import {
  IsOptional, IsObject, IsArray, ArrayNotEmpty, ArrayMaxSize, ValidateNested,
  IsIn, IsString, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SystemGraph, exampleGraph, exampleBusiness } from '@riscly/shared';
import { Store, StoreModule } from '../store/store.module';
import { AnalyzeModule } from '../analyze/analyze.module';
import { AiModule } from '../ai/ai.module';
import { PredictionService } from '../ai/prediction.service';
import { ScannerModule } from '../scanner/scanner.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { BillingService } from '../billing/billing.service';
import { ScanProcessor } from './scan.processor';
import { MonitoringService } from './monitoring.service';

class StartScanDto {
  /** Optional pre-built graph (skips the scanner entirely). */
  @IsOptional() @IsObject()
  graph?: SystemGraph;
}

class FanOutDto {
  /** Additional repos to add as their own projects, cloning this connection. */
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(20) @IsString({ each: true })
  repos!: string[];
}

class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString() @MaxLength(4000)
  content!: string;
}

class ChatDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}

@Controller('projects/:projectId/scans')
class ScansController {
  constructor(
    private readonly store: Store,
    private readonly processor: ScanProcessor,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
    private readonly prediction: PredictionService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  async list(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    await this.requireProject(auth, projectId);
    return this.store.listScans(projectId);
  }

  @Post()
  @RequirePermission('scan:run')
  async start(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: StartScanDto,
  ) {
    await this.requireProject(auth, projectId);
    await this.billing.assertCanScan(auth.org);

    const scan = await this.store.createScan({
      orgId: auth.org.id,
      projectId,
      status: 'queued',
    });

    // Enqueue the work. With the inline queue this completes synchronously;
    // with BullMQ it is processed out of band and the client polls for status.
    await this.processor.enqueue({
      scanId: scan.id,
      projectId,
      graph: dto.graph,
      plan: auth.org.plan,
    });
    void this.audit.record(auth, 'scan.run', { type: 'scan', id: scan.id }, { projectId });

    return this.store.getScan(scan.id);
  }

  /**
   * Onboarding multi-repo: turn each extra selected repo into its own project
   * (cloning this project's GitHub connection token) and scan it, so the user
   * authorizes once and gets a switchable project per repo.
   */
  @Post('fan-out')
  @RequirePermission('scan:run')
  async fanOut(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: FanOutDto,
  ) {
    await this.requireProject(auth, projectId);
    const conns = await this.store.listConnections(projectId);
    const gh = conns.find((c) => c.provider === 'github');
    if (!gh?.encryptedToken) {
      throw new NotFoundException('No GitHub connection to clone.');
    }
    const allRepos = Array.isArray(gh.metadata?.repos)
      ? (gh.metadata.repos as string[])
      : [];

    const created: Array<{ id: string; repo: string }> = [];
    for (const repo of dto.repos.slice(0, 20)) {
      try {
        await this.billing.assertCanCreateProject(auth.org);
      } catch {
        break; // plan limit reached — return what we managed to create
      }
      const name = repo.split('/').pop() ?? repo;
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const project = await this.store.createProject({
        orgId: auth.org.id,
        name,
        slug,
        environment: 'production',
      });
      await this.store.createConnection({
        orgId: auth.org.id,
        projectId: project.id,
        provider: 'github',
        status: 'active',
        metadata: { repos: allRepos, selectedRepos: [repo] },
        encryptedToken: gh.encryptedToken,
      });
      const scan = await this.store.createScan({
        orgId: auth.org.id,
        projectId: project.id,
        status: 'queued',
      });
      await this.processor.enqueue({
        scanId: scan.id,
        projectId: project.id,
        plan: auth.org.plan,
      });
      created.push({ id: project.id, repo });
    }
    void this.audit.record(auth, 'project.fanout', { type: 'project', id: projectId }, {
      count: created.length,
    });
    return { created };
  }

  /**
   * AI failure prediction for the project's latest scan. The org's plan selects
   * the Claude model (Haiku → Sonnet → Opus) and the depth of the analysis.
   */
  @Post('predict')
  @RequirePermission('project:read')
  async predict(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    await this.requireProject(auth, projectId);
    this.billing.assertHasFeature(auth.org, 'aiPredictions', 'AI failure prediction');
    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
    const graph = (latest?.graph as SystemGraph) ?? exampleGraph;
    return this.prediction.predict(graph, {
      currentUsers: exampleBusiness.activeUsers,
      plan: auth.org.plan,
    });
  }

  /**
   * Grounded AI chat about the project's latest scan. Same plan-gating and
   * model selection as prediction; the scanned graph grounds the answers.
   */
  @Post('chat')
  @RequirePermission('project:read')
  async chat(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: ChatDto,
  ) {
    await this.requireProject(auth, projectId);
    this.billing.assertHasFeature(auth.org, 'aiPredictions', 'AI assistant');
    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
    const graph = (latest?.graph as SystemGraph) ?? exampleGraph;
    return this.prediction.chat(graph, dto.messages, { plan: auth.org.plan });
  }

  @Get(':scanId')
  @RequirePermission('project:read')
  async get(@Auth() auth: AuthContext, @Param('scanId') scanId: string) {
    const scan = await this.store.getScan(scanId);
    if (!scan || scan.orgId !== auth.org.id) {
      throw new NotFoundException('Scan not found');
    }
    return scan;
  }

  private async requireProject(auth: AuthContext, projectId: string) {
    const project = await this.store.getProject(projectId);
    if (!project || project.orgId !== auth.org.id) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}

@Module({
  imports: [StoreModule, AnalyzeModule, AiModule, ScannerModule],
  controllers: [ScansController],
  providers: [ScanProcessor, MonitoringService],
})
export class ScansModule {}
