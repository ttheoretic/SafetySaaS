import type { Prediction, SystemGraph } from '@riscly/shared';

/** DI token for the active AI provider. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface PredictRequest {
  graph: SystemGraph;
  /** Deterministic heuristic predictions, given to the model as grounding. */
  heuristics: Prediction[];
  currentUsers?: number;
}

/**
 * Abstraction over the LLM. Implementations must never throw — they return an
 * empty list on any failure so the prediction pipeline degrades gracefully to
 * the deterministic heuristics.
 */
export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  predict(req: PredictRequest): Promise<Prediction[]>;
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
