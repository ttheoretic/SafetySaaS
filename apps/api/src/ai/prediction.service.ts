import { Inject, Injectable } from '@nestjs/common';
import {
  predictFailures,
  aiModelForPlan,
  aiTierForPlan,
  Plan,
  AiTier,
  Prediction,
  SystemGraph,
} from '@riscly/shared';
import { AI_PROVIDER, AiProvider, AnalyzedIssue, ChatMessage } from './ai-provider';

export interface PredictionReport {
  aiEnabled: boolean;
  provider: string;
  /** AI tier actually used (reflects the org's plan). */
  tier: AiTier;
  predictions: Prediction[];
}

/**
 * Orchestrates AI Failure Prediction: always runs the deterministic
 * heuristics, then augments with the AI provider's non-obvious predictions,
 * de-duplicating overlap. Degrades gracefully — if the AI provider is absent
 * or fails, the heuristic predictions are returned on their own.
 */
@Injectable()
export class PredictionService {
  constructor(@Inject(AI_PROVIDER) private readonly ai: AiProvider) {}

  async predict(
    graph: SystemGraph,
    opts: { currentUsers?: number; plan?: Plan } = {},
  ): Promise<PredictionReport> {
    // The plan selects the Claude model & analysis depth. Without a plan
    // (the public demo endpoint) we fall back to the basic tier.
    const tier = opts.plan ? aiTierForPlan(opts.plan) : 'basic';
    const model = opts.plan ? aiModelForPlan(opts.plan) : undefined;

    const heuristics = predictFailures(graph, opts);
    const aiPredictions = await this.ai.predict({
      graph,
      heuristics,
      currentUsers: opts.currentUsers,
      model,
      tier,
    });

    const merged = dedupe([...heuristics, ...aiPredictions]).sort(
      (a, b) => b.likelihood - a.likelihood,
    );

    return {
      aiEnabled: this.ai.enabled,
      provider: this.ai.name,
      tier,
      predictions: merged,
    };
  }

  /**
   * Grounded chat about the user's system. The conversation is answered with
   * the org's plan-selected model, using the scanned graph and heuristic risks
   * as context. Degrades to a graceful message when no AI key is configured.
   */
  async chat(
    graph: SystemGraph,
    messages: ChatMessage[],
    opts: { plan?: Plan } = {},
  ): Promise<{ aiEnabled: boolean; provider: string; reply: string }> {
    const tier = opts.plan ? aiTierForPlan(opts.plan) : 'basic';
    const model = opts.plan ? aiModelForPlan(opts.plan) : undefined;
    const heuristics = predictFailures(graph, {});
    const reply = await this.ai.chat({ graph, heuristics, messages, model, tier });
    return { aiEnabled: this.ai.enabled, provider: this.ai.name, reply };
  }

  /**
   * Generate a corrected version of a file for a located code issue, using the
   * org's plan-selected model. Returns aiEnabled=false (and no fix) when no AI
   * key is configured or the model couldn't produce one.
   */
  async fixCode(
    input: {
      file: string
      content: string
      line: number
      rule: string
      title: string
      description: string
    },
    opts: { plan?: Plan } = {},
  ): Promise<{ aiEnabled: boolean; fixed: string | null; explanation: string | null }> {
    const tier = opts.plan ? aiTierForPlan(opts.plan) : 'opus'
    const model = opts.plan ? aiModelForPlan(opts.plan) : undefined
    const result = await this.ai.generateCodeFix({ ...input, model, tier })
    return {
      aiEnabled: this.ai.enabled,
      fixed: result?.fixed ?? null,
      explanation: result?.explanation ?? null,
    }
  }

  get aiEnabled(): boolean {
    return this.ai.enabled
  }

  /** Deep-analyse one file for security + quality issues (plan-selected model). */
  async analyzeFile(
    file: string,
    content: string,
    opts: { plan?: Plan } = {},
  ): Promise<AnalyzedIssue[]> {
    const tier = opts.plan ? aiTierForPlan(opts.plan) : 'opus'
    const model = opts.plan ? aiModelForPlan(opts.plan) : undefined
    return this.ai.analyzeCode({ file, content, model, tier })
  }
}

/** Drop AI predictions that restate a heuristic (by normalized title). */
function dedupe(predictions: Prediction[]): Prediction[] {
  const seen = new Map<string, Prediction>();
  for (const p of predictions) {
    const key = `${p.nodeId ?? ''}:${normalize(p.title)}`;
    const existing = seen.get(key);
    // Prefer the heuristic version when titles collide (it carries nodeId etc.).
    if (!existing || (existing.source === 'ai' && p.source === 'heuristic')) {
      seen.set(key, p);
    }
  }
  return [...seen.values()];
}

function normalize(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
