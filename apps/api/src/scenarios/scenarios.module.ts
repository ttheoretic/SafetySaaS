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
} from '@riscly/shared';
import { Store, StoreModule, ProjectRecord } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { BillingService } from '../billing/billing.service';

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
    private readonly billing: BillingService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  async list(@Auth() auth: AuthContext, @Param('projectId') projectId: string) {
    await this.requireProject(auth, projectId);
    return this.store.listScenarios(projectId);
  }

  @Post()
  @RequirePermission('project:write')
  async create(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Body() dto: CreateScenarioDto,
  ) {
    await this.requireProject(auth, projectId);
    this.billing.assertHasFeature(auth.org, 'scenarioLab', 'Scenario Lab');
    const scenario = await this.store.createScenario({
      orgId: auth.org.id,
      projectId,
      name: dto.name,
      prompt: dto.prompt ?? '',
      definition: { steps: dto.steps, business: dto.business } as Record<string, unknown>,
    });
    void this.audit.record(auth, 'scenario.create', { type: 'scenario', id: scenario.id }, {
      name: scenario.name,
    });
    return scenario;
  }

  /** Run a saved scenario against the project's latest scan graph. */
  @Post(':id/run')
  @RequirePermission('project:read')
  async run(
    @Auth() auth: AuthContext,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.requireProject(auth, projectId);
    this.billing.assertHasFeature(auth.org, 'scenarioLab', 'Scenario Lab');
    const scenario = await this.store.getScenario(id);
    if (!scenario || scenario.orgId !== auth.org.id || scenario.projectId !== projectId) {
      throw new NotFoundException('Scenario not found');
    }

    const graph = await this.latestGraph(projectId);
    const def = scenario.definition as unknown as {
      steps: ScenarioDefinition['steps'];
      business?: BusinessContext;
    };
    const result = runScenario(graph, { steps: def.steps }, def.business);
    await this.store.updateScenario(id, { lastResult: result });
    return result;
  }

  @Get(':id')
  @RequirePermission('project:read')
  async get(@Auth() auth: AuthContext, @Param('projectId') projectId: string, @Param('id') id: string) {
    const scenario = await this.store.getScenario(id);
    if (!scenario || scenario.orgId !== auth.org.id || scenario.projectId !== projectId) {
      throw new NotFoundException('Scenario not found');
    }
    return scenario;
  }

  /** Use the most recent successful scan's graph, else the demo graph. */
  private async latestGraph(projectId: string): Promise<SystemGraph> {
    const scans = await this.store.listScans(projectId);
    const latest = scans.find((s) => s.status === 'succeeded' && s.graph);
    return (latest?.graph as SystemGraph) ?? exampleGraph;
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
  controllers: [ScenariosController],
})
export class ScenariosModule {}
