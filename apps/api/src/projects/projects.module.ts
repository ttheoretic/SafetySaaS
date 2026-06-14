import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Store, StoreModule } from '../store/store.module';

class CreateProjectDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsIn(['production', 'staging', 'development'])
  environment?: string;
}

/** Demo org id for the scaffold; real requests resolve org from the JWT. */
const DEMO_ORG = 'demo-org';

@Controller('projects')
class ProjectsController {
  constructor(private readonly store: Store) {}

  @Get()
  list() {
    return this.store.listProjects(DEMO_ORG);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    const slug = dto.slug ?? slugify(dto.name);
    return this.store.createProject({
      orgId: DEMO_ORG,
      name: dto.name,
      slug,
      environment: dto.environment ?? 'production',
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const project = this.store.getProject(id);
    if (!project) throw new NotFoundException('Project not found');
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
