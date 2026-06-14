import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { OrgsModule } from './orgs/orgs.module';
import { ProjectsModule } from './projects/projects.module';
import { ConnectionsModule } from './connections/connections.module';
import { ScansModule } from './scans/scans.module';
import { ScenariosModule } from './scenarios/scenarios.module';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    AnalyzeModule,
    OrgsModule,
    ProjectsModule,
    ConnectionsModule,
    ScansModule,
    ScenariosModule,
  ],
})
export class AppModule {}
