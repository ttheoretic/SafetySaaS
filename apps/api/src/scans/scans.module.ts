import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsOptional, IsObject } from 'class-validator';
import { SystemGraph } from '@riscly/shared';
import { Store, StoreModule } from '../store/store.module';
import { AnalyzeModule } from '../analyze/analyze.module';
import { ScannerModule } from '../scanner/scanner.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { ScanProcessor } from './scan.processor';

class StartScanDto {
  /** Optional pre-built graph (skips the scanner entirely). */
  @IsOptional() @IsObject()
  graph?: SystemGraph;
}

@Controller('projects/:projectId/scans')
class ScansController {
  constructor(
    private readonly store: Store,
    private readonly processor: ScanProcessor,
    private readonly audit: AuditService,
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

    const scan = await this.store.createScan({
      orgId: auth.org.id,
      projectId,
      status: 'queued',
    });

    // Enqueue the work. With the inline queue this completes synchronously;
    // with BullMQ it is processed out of band and the client polls for status.
    await this.processor.enqueue({ scanId: scan.id, projectId, graph: dto.graph });
    void this.audit.record(auth, 'scan.run', { type: 'scan', id: scan.id }, { projectId });

    return this.store.getScan(scan.id);
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
  imports: [StoreModule, AnalyzeModule, ScannerModule],
  controllers: [ScansController],
  providers: [ScanProcessor],
})
export class ScansModule {}
