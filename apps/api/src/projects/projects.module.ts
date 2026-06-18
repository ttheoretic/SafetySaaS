import {
  Body, Controller, Get, Module, NotFoundException, Param, Post, Put,
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min, Max, Length } from 'class-validator';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { BillingService } from '../billing/billing.service';

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

@Controller('projects')
class ProjectsController {
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
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
})
export class ProjectsModule {}
