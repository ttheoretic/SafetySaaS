import type { AiTier, Prediction, SystemGraph } from '@riscly/shared';

/** DI token for the active AI provider. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface PredictRequest {
  graph: SystemGraph;
  /** Deterministic heuristic predictions, given to the model as grounding. */
  heuristics: Prediction[];
  currentUsers?: number;
  /** Concrete model id to use; falls back to the provider default. */
  model?: string;
  /** Tier hint — higher tiers get a larger token budget & deeper analysis. */
  tier?: AiTier;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  /** Conversation so far (most recent last). */
  messages: ChatMessage[];
  /** The scanned system, used to ground the assistant's answers. */
  graph: SystemGraph;
  /** Deterministic heuristic risks for additional grounding. */
  heuristics: Prediction[];
  model?: string;
  tier?: AiTier;
}

/**
 * Abstraction over the LLM. Implementations must never throw — they return an
 * empty list (or a graceful message for chat) on any failure so the pipeline
 * degrades gracefully to the deterministic heuristics.
 */
export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  predict(req: PredictRequest): Promise<Prediction[]>;
  /** Grounded Q&A about the user's architecture and risks. */
  chat(req: ChatRequest): Promise<string>;
}

/** JSON schema the model's structured output must satisfy. */
export const PREDICTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    predictions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['bottleneck', 'scaling', 'architecture', 'security'],
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          likelihood: { type: 'number' },
          horizon: { type: 'string' },
          rationale: { type: 'string' },
          recommendation: { type: 'string' },
        },
        required: [
          'title', 'category', 'severity', 'likelihood',
          'horizon', 'rationale', 'recommendation',
        ],
      },
    },
  },
  required: ['predictions'],
} as const;
