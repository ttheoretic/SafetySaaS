import type { Prediction } from '@failsafe/shared';
import { AiProvider } from './ai-provider';

/**
 * No-op provider used when no AI key is configured. The prediction pipeline
 * then runs on the deterministic heuristics alone — fully functional, just
 * without the LLM-surfaced, non-obvious predictions.
 */
export class NullAiProvider implements AiProvider {
  readonly name = 'none';
  readonly enabled = false;
  async predict(): Promise<Prediction[]> {
    return [];
  }
}
