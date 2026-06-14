import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  SystemGraph,
  SimulationType,
  BusinessContext,
} from '@failsafe/shared';

const SIMULATION_TYPES = [
  'infra_server', 'infra_region', 'dns', 'db_lock', 'cache', 'queue',
  'stripe_down', 'openai_down', 'aws_down', 'cloudflare_down',
  'traffic_10x', 'traffic_100x', 'viral_peak',
  'churn_wave', 'payment_failure', 'refund_spike',
] as const;

export class GraphDto {
  @IsArray()
  nodes!: SystemGraph['nodes'];

  @IsArray()
  edges!: SystemGraph['edges'];
}

export class AnalyzeDto {
  @ValidateNested()
  @Type(() => GraphDto)
  graph!: GraphDto;
}

export class BusinessDto {
  @IsNumber() monthlyRevenue!: number;
  @IsNumber() activeUsers!: number;
  @IsOptional() @IsNumber() peakCheckoutShare?: number;
  @IsOptional() @IsNumber() slaCreditRatePerHour?: number;
  @IsOptional() @IsString() currency?: string;
}

export class SimulateDto {
  @ValidateNested()
  @Type(() => GraphDto)
  graph!: GraphDto;

  @IsIn(SIMULATION_TYPES)
  type!: SimulationType;

  @IsOptional() @IsObject()
  params?: Record<string, unknown>;

  @IsOptional() @IsNumber()
  durationHours?: number;

  @IsOptional() @ValidateNested() @Type(() => BusinessDto)
  business?: BusinessContext;
}
