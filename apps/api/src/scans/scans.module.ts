import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsOptional, IsObject } from 'class-validator';
import { exampleGraph, SystemGraph } from '@failsafe/shared';
import { Store, StoreModule } from '../store/store.module';
import { AnalyzeModule } from '../analyze/analyze.module';
import { AnalyzeService } from '../analyze/analyze.service';
import { ScannerModule } from '../scanner/scanner.module';
import { ScannerService } from '../scanner/scanner.service';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';

class StartScanDto {
  /** Optional pre-built graph (skips the scanner entirely). */
  @IsOptional() @IsObject()
  graph?: SystemGraph;
}

@Controller('projects/:projectId/scans')
class ScansController {
  constructor(
    private readonly store: Store,
    private readonly analyze: AnalyzeService,
    private readonly scanner: ScannerService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  list(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    this.requireProject(auth, projectId);
    return this.store.listScans(projectId);
  }

  @Post()
  @RequirePermission('scan:run')
  async start(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: StartScanDto,
  ) {
    const project = this.requireProject(auth, projectId);

    const scan = this.store.createScan({
      orgId: project.orgId,
      projectId,
      status: 'running',
    });

    try {
      // Precedence: an explicit graph wins; otherwise build one from the
      // project's connections; if there are none, fall back to the demo graph.
      let graph = dto.graph;
      if (!graph) {
        const connections = this.store.listConnections(projectId);
        graph = connections.length
          ? await this.scanner.scan(connections)
          : exampleGraph;
      }

      // The production pipeline enqueues a BullMQ job; the scaffold runs the
      // deterministic engines inline.
      const analysis = this.analyze.reliability(graph);
      const updated = this.store.updateScan(scan.id, {
        status: 'succeeded',
        graph,
        reliabilityScore: analysis.score,
        findings: analysis.findings,
        recommendations: analysis.recommendations,
        finishedAt: new Date().toISOString(),
      });
      this.audit.record(auth, 'scan.run', { type: 'scan', id: scan.id }, {
        projectId,
        reliabilityScore: analysis.score,
      });
      return updated;
    } catch (err) {
      return this.store.updateScan(scan.id, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
      });
    }
  }

  @Get(':scanId')
  @RequirePermission('project:read')
  get(@Auth() auth: AuthContext, @Param('scanId') scanId: string) {
    const scan = this.store.getScan(scanId);
    if (!scan || scan.orgId !== auth.org.id) {
      throw new NotFoundException('Scan not found');
    }
    return scan;
  }

  /** Ensure the project exists and belongs to the caller's org. */
  private requireProject(auth: AuthContext, projectId: string) {
    const project = this.store.getProject(projectId);
    if (!project || project.orgId !== auth.org.id) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}

@Module({
  imports: [StoreModule, AnalyzeModule, ScannerModule],
  controllers: [ScansController],
})
export class ScansModule {}
