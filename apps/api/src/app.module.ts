import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { ProjectsModule } from './projects/projects.module';
import { ConnectionsModule } from './connections/connections.module';
import { ScansModule } from './scans/scans.module';

@Module({
  imports: [
    HealthModule,
    AnalyzeModule,
    ProjectsModule,
    ConnectionsModule,
    ScansModule,
  ],
})
export class AppModule {}
