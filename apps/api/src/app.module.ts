import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { ProjectsModule } from './projects/projects.module';
import { ScansModule } from './scans/scans.module';

@Module({
  imports: [HealthModule, AnalyzeModule, ProjectsModule, ScansModule],
})
export class AppModule {}
