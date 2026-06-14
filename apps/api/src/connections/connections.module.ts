import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { Store, StoreModule, ProjectRecord } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { SecretBox } from '../crypto/secret-box';

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
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
    private readonly secrets: SecretBox,
  ) {}

  @Get()
  @RequirePermission('project:read')
  list(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    this.requireProject(auth, projectId);
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
  @RequirePermission('connection:write')
  create(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CreateConnectionDto,
  ) {
    this.requireProject(auth, projectId);
    const conn = this.store.createConnection({
      orgId: auth.org.id,
      projectId,
      provider: dto.provider,
      status: 'active',
      metadata: dto.metadata ?? {},
      // Token is encrypted at rest and never returned in any response.
      encryptedToken: dto.token ? this.secrets.encrypt(dto.token) : undefined,
    });
    this.audit.record(auth, 'connection.create', { type: 'connection', id: conn.id }, {
      provider: dto.provider,
    });
    return { id: conn.id, provider: conn.provider, status: conn.status };
  }

  private requireProject(auth: AuthContext, projectId: string): ProjectRecord {
    const project = this.store.getProject(projectId);
    if (!project || project.orgId !== auth.org.id) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}

@Module({
  imports: [StoreModule],
  controllers: [ConnectionsController],
})
export class ConnectionsModule {}
