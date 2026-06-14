import {
  Body, Controller, Get, Module, NotFoundException, Param, Post,
} from '@nestjs/common';
import {
  ArrayNotEmpty, IsArray, IsObject, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  runScenario,
  exampleGraph,
  ScenarioDefinition,
  SystemGraph,
  BusinessContext,
} from '@failsafe/shared';
import { Store, StoreModule, ProjectRecord } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';

class StepDto {
  @IsString() type!: string;
  @IsOptional() @IsObject() params?: Record<string, unknown>;
  @IsOptional() durationHours?: number;
}

class CreateScenarioDto {
  @IsString() name!: string;
  /** The natural-language "what-if" question. */
  @IsOptional() @IsString() prompt?: string;
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => StepDto)
  steps!: StepDto[];
  @IsOptional() @IsObject() business?: BusinessContext;
}

@Controller('projects/:projectId/scenarios')
class ScenariosController {
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  list(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    this.requireProject(auth, projectId);
    return this.store.listScenarios(projectId);
  }

  @Post()
  @RequirePermission('project:write')
  create(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CreateScenarioDto,
  ) {
    this.requireProject(auth, projectId);
    const scenario = this.store.createScenario({
      orgId: auth.org.id,
      projectId,
      name: dto.name,
      prompt: dto.prompt ?? '',
      definition: { steps: dto.steps, business: dto.business } as Record<string, unknown>,
    });
    this.audit.record(auth, 'scenario.create', { type: 'scenario', id: scenario.id }, {
      name: scenario.name,
    });
    return scenario;
  }

  /** Run a saved scenario against the project's latest scan graph. */
  @Post(':id/run')
  @RequirePermission('project:read')
  run(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    this.requireProject(auth, projectId);
    const scenario = this.store.getScenario(id);
    if (!scenario || scenario.orgId !== auth.org.id || scenario.projectId !== projectId) {
      throw new NotFoundException('Scenario not found');
    }

    const graph = this.latestGraph(projectId);
    const def = scenario.definition as unknown as {
      steps: ScenarioDefinition['steps'];
      business?: BusinessContext;
    };
    const result = runScenario(graph, { steps: def.steps }, def.business);
    this.store.updateScenario(id, { lastResult: result });
    return result;
  }

  @Get(':id')
  @RequirePermission('project:read')
  get(@Auth() auth: AuthContext, @Param('projectId') projectId: string, @Param('id') id: string) {
    const scenario = this.store.getScenario(id);
    if (!scenario || scenario.orgId !== auth.org.id || scenario.projectId !== projectId) {
      throw new NotFoundException('Scenario not found');
    }
    return scenario;
  }

  /** Use the most recent successful scan's graph, else the demo graph. */
  private latestGraph(projectId: string): SystemGraph {
    const latest = this.store
      .listScans(projectId)
      .find((s) => s.status === 'succeeded' && s.graph);
    return (latest?.graph as SystemGraph) ?? exampleGraph;
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
  controllers: [ScenariosController],
})
export class ScenariosModule {}
