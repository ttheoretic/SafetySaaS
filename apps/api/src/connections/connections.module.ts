import {
  Body, Controller, Get, Module, NotFoundException, Param, Patch, Post,
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

class UpdateConnectionDto {
  /** Non-secret config to merge in, e.g. { selectedRepos: ["org/repo"] }. */
  @IsObject() metadata!: Record<string, unknown>;
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
  async list(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    await this.requireProject(auth, projectId);
    // Secrets are never exposed; only safe fields are returned.
    const connections = await this.store.listConnections(projectId);
    return connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      metadata: c.metadata,
      createdAt: c.createdAt,
    }));
  }

  @Post()
  @RequirePermission('connection:write')
  async create(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CreateConnectionDto,
  ) {
    await this.requireProject(auth, projectId);
    const conn = await this.store.createConnection({
      orgId: auth.org.id,
      projectId,
      provider: dto.provider,
      status: 'active',
      metadata: dto.metadata ?? {},
      // Token is encrypted at rest and never returned in any response.
      encryptedToken: dto.token ? this.secrets.encrypt(dto.token) : undefined,
    });
    void this.audit.record(auth, 'connection.create', { type: 'connection', id: conn.id }, {
      provider: dto.provider,
    });
    return { id: conn.id, provider: conn.provider, status: conn.status };
  }

  /** Merge non-secret config into a connection (e.g. which repos to scan). */
  @Patch(':connectionId')
  @RequirePermission('connection:write')
  async update(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    await this.requireProject(auth, projectId);
    const conn = await this.store.getConnection(connectionId);
    if (!conn || conn.projectId !== projectId || conn.orgId !== auth.org.id) {
      throw new NotFoundException('Connection not found');
    }
    const merged = { ...conn.metadata, ...dto.metadata };
    const updated = await this.store.updateConnectionMetadata(connectionId, merged);
    void this.audit.record(auth, 'connection.update', { type: 'connection', id: connectionId }, {
      keys: Object.keys(dto.metadata),
    });
    return {
      id: updated.id, provider: updated.provider, status: updated.status, metadata: updated.metadata,
    };
  }

  private async requireProject(auth: AuthContext, projectId: string): Promise<ProjectRecord> {
    const project = await this.store.getProject(projectId);
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
