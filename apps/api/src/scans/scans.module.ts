import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsOptional, IsObject } from 'class-validator';
import { exampleGraph, SystemGraph } from '@failsafe/shared';
import { Store, StoreModule } from '../store/store.module';
import { AnalyzeModule } from '../analyze/analyze.module';
import { AnalyzeService } from '../analyze/analyze.service';

class StartScanDto {
  /** Optional pre-built graph. If absent, the scanner would build one from the
   *  project's connections; the scaffold falls back to the example graph. */
  @IsOptional() @IsObject()
  graph?: SystemGraph;
}

@Controller('projects/:projectId/scans')
class ScansController {
  constructor(
    private readonly store: Store,
    private readonly analyze: AnalyzeService,
  ) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.store.listScans(projectId);
  }

  @Post()
  start(@Param('projectId') projectId: string, @Body() dto: StartScanDto) {
    const project = this.store.getProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const graph = dto.graph ?? exampleGraph;
    const scan = this.store.createScan({
      orgId: project.orgId,
      projectId,
      status: 'running',
    });

    // The real pipeline enqueues a BullMQ job; the scaffold runs the pure
    // engine synchronously since it is fast and deterministic.
    const analysis = this.analyze.reliability(graph);
    return this.store.updateScan(scan.id, {
      status: 'succeeded',
      graph,
      reliabilityScore: analysis.score,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
      finishedAt: new Date().toISOString(),
    });
  }

  @Get(':scanId')
  get(@Param('scanId') scanId: string) {
    const scan = this.store.getScan(scanId);
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }
}

@Module({
  imports: [StoreModule, AnalyzeModule],
  controllers: [ScansController],
})
export class ScansModule {}
