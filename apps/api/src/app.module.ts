import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AuthConfigModule } from './auth/auth-config.module';
import { CryptoModule } from './crypto/crypto.module';
import { EmailModule } from './email/email.module';
import { SupportModule } from './email/support.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { OrgsModule } from './orgs/orgs.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ProjectsModule } from './projects/projects.module';
import { ConnectionsModule } from './connections/connections.module';
import { GithubModule } from './github/github.module';
import { ScansModule } from './scans/scans.module';
import { OAuthModule } from './oauth/oauth.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { ReportsModule } from './reports/reports.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    AuthModule,
    AuthConfigModule,
    CryptoModule,
    EmailModule,
    SupportModule,
    JobsModule,
    BillingModule,
    HealthModule,
    AnalyzeModule,
    OrgsModule,
    InvitationsModule,
    ProjectsModule,
    ConnectionsModule,
    GithubModule,
    ScansModule,
    OAuthModule,
    ScenariosModule,
    ReportsModule,
  ],
})
export class AppModule {}
