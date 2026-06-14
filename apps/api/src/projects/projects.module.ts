import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Store, StoreModule } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';

class CreateProjectDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsIn(['production', 'staging', 'development'])
  environment?: string;
}

@Controller('projects')
class ProjectsController {
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  list(@Auth() auth: AuthContext) {
    return this.store.listProjects(auth.org.id);
  }

  @Post()
  @RequirePermission('project:write')
  create(@Auth() auth: AuthContext, @Body() dto: CreateProjectDto) {
    const slug = dto.slug ?? slugify(dto.name);
    const project = this.store.createProject({
      orgId: auth.org.id,
      name: dto.name,
      slug,
      environment: dto.environment ?? 'production',
    });
    this.audit.record(auth, 'project.create', { type: 'project', id: project.id }, { name: project.name });
    return project;
  }

  @Get(':id')
  @RequirePermission('project:read')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    const project = this.store.getProject(id);
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
