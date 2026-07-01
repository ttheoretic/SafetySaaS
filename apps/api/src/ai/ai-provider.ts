import type { AiTier, Prediction, SystemGraph } from '@riscly/shared';

/** DI token for the active AI provider. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

/** Token usage reported by a provider after a single LLM call. */
export interface AiUsageReport {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
/** Optional sink a request can carry so the call's token usage is recorded. */
export type OnUsage = (u: AiUsageReport) => void;

export interface PredictRequest {
  graph: SystemGraph;
  /** Deterministic heuristic predictions, given to the model as grounding. */
  heuristics: Prediction[];
  currentUsers?: number;
  /** Concrete model id to use; falls back to the provider default. */
  model?: string;
  /** Tier hint — higher tiers get a larger token budget & deeper analysis. */
  tier?: AiTier;
  onUsage?: OnUsage;
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
  onUsage?: OnUsage;
}

/**
 * Abstraction over the LLM. Implementations must never throw — they return an
 * empty list (or a graceful message for chat) on any failure so the pipeline
 * degrades gracefully to the deterministic heuristics.
 */
export interface CodeFixRequest {
  /** Repo-relative path, for context. */
  file: string;
  rule: string;
  title: string;
  description: string;
  /** The full current file content to fix. */
  content: string;
  /** 1-based line of the issue. */
  line: number;
  model?: string;
  tier?: AiTier;
  onUsage?: OnUsage;
}

export interface CodeFixResult {
  /** The full corrected file content. */
  fixed: string;
  /** Short human explanation of the change. */
  explanation: string;
}

export interface CodeAnalysisRequest {
  file: string;
  content: string;
  model?: string;
  tier?: AiTier;
  onUsage?: OnUsage;
}

export interface RefactorPlanRequest {
  file: string;
  /** The current file content (may be large — it is only read, not rewritten). */
  content: string;
  /** Human summary of the maintainability metrics (LOC, complexity, nesting…). */
  metrics: string;
  model?: string;
  tier?: AiTier;
  onUsage?: OnUsage;
}

export interface RefactorPlanResult {
  /** A concrete, prioritized refactoring plan in markdown. */
  plan: string;
}

/** A single issue the model located in a file. */
export interface AnalyzedIssue {
  line: number;
  endLine?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Short rule id, e.g. "security/sql-injection", "quality/dead-code". */
  rule: string;
  title: string;
  description: string;
}

export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  predict(req: PredictRequest): Promise<Prediction[]>;
  /** Grounded Q&A about the user's architecture and risks. */
  chat(req: ChatRequest): Promise<string>;
  /** Generate a corrected version of a file for a code issue, or null. */
  generateCodeFix(req: CodeFixRequest): Promise<CodeFixResult | null>;
  /** Deep-analyse a file for security + quality + correctness issues. */
  analyzeCode(req: CodeAnalysisRequest): Promise<AnalyzedIssue[]>;
  /** Produce a targeted maintainability refactoring plan (not a rewrite), or null. */
  generateRefactorPlan(req: RefactorPlanRequest): Promise<RefactorPlanResult | null>;
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
