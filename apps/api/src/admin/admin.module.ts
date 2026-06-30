import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { StoreModule, Store } from '../store/store.module';
import { Auth, AuthContext, AllowWithoutSubscription } from '../auth/auth-context';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminStripeService } from './admin-stripe.service';
import { AdminAnalyticsService } from './admin-analytics.service';

class FeedbackPatchDto {
  @IsOptional() @IsIn(['open', 'planned', 'in_progress', 'completed', 'archived']) status?: string;
  @IsOptional() @IsIn(['low', 'medium', 'high', 'critical']) priority?: string;
  @IsOptional() @IsString() @Length(0, 120) assignee?: string;
  @IsOptional() @IsString() @Length(0, 4000) adminReply?: string;
  @IsOptional() @IsInt() votes?: number;
}

class SettingDto {
  @IsObject() value!: Record<string, unknown>;
}

class SubmitFeedbackDto {
  @IsString() @Length(3, 160) title!: string;
  @IsString() @Length(3, 4000) body!: string;
  @IsIn(['bug', 'feature', 'improvement', 'question']) category!: 'bug' | 'feature' | 'improvement' | 'question';
}

/** Internal admin console — every route gated by AdminGuard (platform staff). */
@AllowWithoutSubscription()
@UseGuards(AdminGuard)
@Controller('admin')
class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly analytics: AdminAnalyticsService,
  ) {}

  @Get('analytics')
  productAnalytics() {
    return this.analytics.analytics();
  }

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('activity')
  activity(@Query('limit') limit?: string) {
    return this.admin.activity(limit ? Math.min(100, Number(limit)) : 25);
  }

  @Get('customers')
  customers() {
    return this.admin.customers();
  }

  @Get('customers/:orgId')
  customer(@Param('orgId') orgId: string) {
    return this.admin.customer(orgId);
  }

  @Post('customers/:orgId/suspend')
  async suspend(@Auth() auth: AuthContext, @Param('orgId') orgId: string) {
    const r = await this.admin.suspendWorkspace(orgId);
    await this.admin.logAction(auth.user.id, 'workspace.suspend', { type: 'org', id: orgId });
    return r;
  }

  @Post('customers/:orgId/reactivate')
  async reactivate(@Auth() auth: AuthContext, @Param('orgId') orgId: string) {
    const r = await this.admin.reactivateWorkspace(orgId);
    await this.admin.logAction(auth.user.id, 'workspace.reactivate', { type: 'org', id: orgId });
    return r;
  }

  @Post('customers/:orgId/reset-subscription')
  async resetSub(@Auth() auth: AuthContext, @Param('orgId') orgId: string) {
    const r = await this.admin.resetSubscription(orgId);
    await this.admin.logAction(auth.user.id, 'subscription.reset', { type: 'org', id: orgId });
    return r;
  }

  @Get('customers/:orgId/export')
  async exportWorkspace(@Auth() auth: AuthContext, @Param('orgId') orgId: string) {
    const data = await this.admin.exportWorkspace(orgId);
    await this.admin.logAction(auth.user.id, 'workspace.export', { type: 'org', id: orgId });
    return data;
  }

  @Get('billing')
  billing() {
    return this.admin.billing();
  }

  @Get('ai-usage')
  aiUsage() {
    return this.admin.aiUsage();
  }

  @Get('feedback')
  feedback() {
    return this.admin.feedback();
  }

  @Patch('feedback/:id')
  async patchFeedback(@Auth() auth: AuthContext, @Param('id') id: string, @Body() dto: FeedbackPatchDto) {
    const r = await this.admin.updateFeedback(id, { ...dto });
    await this.admin.logAction(auth.user.id, 'feedback.update', { type: 'feedback', id }, { ...dto });
    return r;
  }

  @Get('infrastructure')
  infra() {
    return this.admin.infra();
  }

  @Get('settings')
  settings() {
    return this.admin.settings();
  }

  @Patch('settings/:key')
  async patchSetting(@Auth() auth: AuthContext, @Param('key') key: string, @Body() dto: SettingDto) {
    const r = await this.admin.updateSetting(key, dto.value);
    await this.admin.logAction(auth.user.id, 'settings.update', { type: 'setting', id: key });
    return r;
  }

  @Get('logs')
  logs() {
    return this.admin.logs();
  }
}

/** Customer-facing feedback submission (any authenticated user, no paywall). */
@AllowWithoutSubscription()
@Controller('feedback')
class FeedbackController {
  constructor(private readonly store: Store) {}

  @Post()
  async submit(@Auth() auth: AuthContext, @Body() dto: SubmitFeedbackDto) {
    const f = await this.store.createFeedback({
      orgId: auth.org.id,
      userId: auth.user.id,
      title: dto.title,
      body: dto.body,
      category: dto.category,
      priority: 'medium',
      status: 'open',
      votes: 0,
    });
    return { id: f.id, status: f.status };
  }
}

@Module({
  imports: [StoreModule],
  controllers: [AdminController, FeedbackController],
  providers: [AdminService, AdminStripeService, AdminAnalyticsService, AdminGuard],
})
export class AdminModule {}
