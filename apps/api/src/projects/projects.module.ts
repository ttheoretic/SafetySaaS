import {
  Body, Controller, Get, Module, NotFoundException, Param, Post, Put,
} from '@nestjs/common';
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, Max, Length } from 'class-validator';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { BillingService } from '../billing/billing.service';
import { SecretBox } from '../crypto/secret-box';
import { StripeRevenueService } from '../billing/stripe-revenue.service';

class CreateProjectDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsIn(['production', 'staging', 'development'])
  environment?: string;
}

class BusinessContextDto {
  @IsNumber() @Min(0) monthlyRevenue!: number;
  @IsNumber() @Min(0) activeUsers!: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) peakCheckoutShare?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) slaCreditRatePerHour?: number;
}

class ArchitectureOverlayDto {
  @IsOptional() @IsArray() removedNodeIds?: string[];
  @IsOptional() @IsArray() addedNodes?: unknown[];
  @IsOptional() @IsObject() nodeOverrides?: Record<string, unknown>;
  @IsOptional() @IsArray() removedEdges?: unknown[];
  @IsOptional() @IsArray() addedEdges?: unknown[];
}

@Controller('projects')
class ProjectsController {
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
    private readonly secrets: SecretBox,
    private readonly stripeRevenue: StripeRevenueService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  list(@Auth() auth: AuthContext) {
    return this.store.listProjects(auth.org.id);
  }

  @Post()
  @RequirePermission('project:write')
  async create(@Auth() auth: AuthContext, @Body() dto: CreateProjectDto) {
    await this.billing.assertCanCreateProject(auth.org);
    const slug = dto.slug ?? slugify(dto.name);
    const project = await this.store.createProject({
      orgId: auth.org.id,
      name: dto.name,
      slug,
      environment: dto.environment ?? 'production',
    });
    void this.audit.record(auth, 'project.create', { type: 'project', id: project.id }, { name: project.name });
    return project;
  }

  @Get(':id')
  @RequirePermission('project:read')
  async get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.requireProject(auth, id);
  }

  /** The project's business context (MRR, active users) for revenue impact. */
  @Get(':id/business')
  @RequirePermission('project:read')
  async getBusiness(@Auth() auth: AuthContext, @Param('id') id: string) {
    const project = await this.requireProject(auth, id);
    return project.businessContext ?? null;
  }

  @Put(':id/business')
  @RequirePermission('project:write')
  async setBusiness(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: BusinessContextDto,
  ) {
    await this.requireProject(auth, id);
    const updated = await this.store.updateProject(id, {
      businessContext: { ...dto, currency: dto.currency ?? 'EUR' },
    });
    void this.audit.record(auth, 'project.business.update', { type: 'project', id }, {});
    return updated?.businessContext ?? null;
  }

  /** The customer's manual corrections to the auto-detected architecture. */
  @Get(':id/architecture-overlay')
  @RequirePermission('project:read')
  async getOverlay(@Auth() auth: AuthContext, @Param('id') id: string) {
    const project = await this.requireProject(auth, id);
    return project.architectureOverlay ?? null;
  }

  @Put(':id/architecture-overlay')
  @RequirePermission('project:write')
  async setOverlay(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: ArchitectureOverlayDto,
  ) {
    await this.requireProject(auth, id);
    const updated = await this.store.updateProject(id, {
      architectureOverlay: dto as unknown as Record<string, unknown>,
    });
    void this.audit.record(auth, 'project.architecture.update', { type: 'project', id }, {});
    return updated?.architectureOverlay ?? null;
  }

  /** Live MRR / active-subscription suggestion from a connected Stripe account. */
  @Get(':id/business/stripe-suggestion')
  @RequirePermission('project:read')
  async stripeSuggestion(@Auth() auth: AuthContext, @Param('id') id: string) {
    await this.requireProject(auth, id);
    const connections = await this.store.listConnections(id);
    const stripe = connections.find((c) => c.provider === 'stripe' && c.encryptedToken);
    if (!stripe?.encryptedToken) return null;
    let token: string;
    try {
      token = this.secrets.decrypt(stripe.encryptedToken);
    } catch {
      return null;
    }
    return this.stripeRevenue.fetchMrr(token);
  }

  private async requireProject(auth: AuthContext, id: string) {
    const project = await this.store.getProject(id);
    if (!project || project.orgId !== auth.org.id) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Module({
  imports: [StoreModule],
  controllers: [ProjectsController],
  providers: [StripeRevenueService],
})
export class ProjectsModule {}
