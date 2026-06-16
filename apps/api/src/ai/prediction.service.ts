import { Inject, Injectable } from '@nestjs/common';
import {
  predictFailures,
  Prediction,
  SystemGraph,
} from '@riscly/shared';
import { AI_PROVIDER, AiProvider } from './ai-provider';

export interface PredictionReport {
  aiEnabled: boolean;
  provider: string;
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
    opts: { currentUsers?: number } = {},
  ): Promise<PredictionReport> {
    const heuristics = predictFailures(graph, opts);
    const aiPredictions = await this.ai.predict({
      graph,
      heuristics,
      currentUsers: opts.currentUsers,
    });

    const merged = dedupe([...heuristics, ...aiPredictions]).sort(
      (a, b) => b.likelihood - a.likelihood,
    );

    return {
      aiEnabled: this.ai.enabled,
      provider: this.ai.name,
      predictions: merged,
    };
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
