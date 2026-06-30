import { Injectable, Logger } from '@nestjs/common';
import { Store } from '../store/store.module';
import type { AiUsageReport } from './ai-provider';

/** Approximate Anthropic list prices, USD per 1M tokens (input, output). */
const PRICE_PER_MTOK: { match: RegExp; in: number; out: number }[] = [
  { match: /opus/i, in: 15, out: 75 },
  { match: /sonnet/i, in: 3, out: 15 },
  { match: /haiku/i, in: 0.8, out: 4 },
];

function costFor(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_MTOK.find((x) => x.match.test(model)) ?? { in: 3, out: 15 };
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

/**
 * Records one row per LLM call for the admin AI-usage analytics. Fire-and-forget
 * and fully isolated — a recording failure never affects the AI response.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly store: Store) {}

  /** Build an onUsage sink bound to a tenant + feature. */
  sink(ctx: { orgId: string; userId?: string; feature: string }): (u: AiUsageReport) => void {
    return (u) => {
      void this.store
        .addAiUsage({
          orgId: ctx.orgId,
          userId: ctx.userId,
          feature: ctx.feature,
          model: u.model,
          promptTokens: u.inputTokens,
          completionTokens: u.outputTokens,
          costUsd: costFor(u.model, u.inputTokens, u.outputTokens),
          latencyMs: u.latencyMs,
        })
        .catch((e) => this.logger.warn(`AI usage record failed: ${(e as Error).message}`));
    };
  }
}
