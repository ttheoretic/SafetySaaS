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
  ) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.store.listScans(projectId);
  }

  @Post()
  async start(
    @Param('projectId') projectId: string,
    @Body() dto: StartScanDto,
  ) {
    const project = this.store.getProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

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
      return this.store.updateScan(scan.id, {
        status: 'succeeded',
        graph,
        reliabilityScore: analysis.score,
        findings: analysis.findings,
        recommendations: analysis.recommendations,
        finishedAt: new Date().toISOString(),
      });
    } catch (err) {
      return this.store.updateScan(scan.id, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
      });
    }
  }

  @Get(':scanId')
  get(@Param('scanId') scanId: string) {
    const scan = this.store.getScan(scanId);
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }
}

@Module({
  imports: [StoreModule, AnalyzeModule, ScannerModule],
  controllers: [ScansController],
})
export class ScansModule {}
