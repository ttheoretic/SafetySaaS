import type { Prediction } from '@riscly/shared';
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

  async chat(): Promise<string> {
    return (
      'The AI assistant is not configured on this server (no ANTHROPIC_API_KEY). ' +
      'The heuristic predictions on this page remain fully available, and the ' +
      'assistant will answer your questions once a key is set.'
    );
  }

  async generateCodeFix(): Promise<null> {
    return null;
  }

  async analyzeCode(): Promise<never[]> {
    return [];
  }
}
