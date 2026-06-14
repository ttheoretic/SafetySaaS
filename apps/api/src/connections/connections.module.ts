import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { Store, StoreModule } from '../store/store.module';

const PROVIDERS = [
  'github', 'gitlab', 'bitbucket', 'aws', 'azure', 'gcp',
  'vercel', 'railway', 'render', 'supabase', 'neon', 'stripe',
] as const;

class CreateConnectionDto {
  @IsIn(PROVIDERS) provider!: string;
  /** Non-secret config: { repos: [...], region, services, signals, ... }. */
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  /** Access token is accepted but never returned; encrypted at rest in prod. */
  @IsOptional() @IsString() token?: string;
}

@Controller('projects/:projectId/connections')
class ConnectionsController {
  constructor(private readonly store: Store) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    // Secrets are never exposed; only safe fields are returned.
    return this.store.listConnections(projectId).map((c) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      metadata: c.metadata,
      createdAt: c.createdAt,
    }));
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateConnectionDto,
  ) {
    const project = this.store.getProject(projectId);
    if (!project) throw new NotFoundException('Project not found');
    const conn = this.store.createConnection({
      orgId: project.orgId,
      projectId,
      provider: dto.provider,
      status: 'active',
      metadata: dto.metadata ?? {},
    });
    return { id: conn.id, provider: conn.provider, status: conn.status };
  }
}

@Module({
  imports: [StoreModule],
  controllers: [ConnectionsController],
})
export class ConnectionsModule {}
