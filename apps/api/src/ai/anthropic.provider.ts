import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { Prediction } from '@failsafe/shared';
import {
  AiProvider,
  PredictRequest,
  PREDICTION_SCHEMA,
} from './ai-provider';

/**
 * AI Failure Prediction via Anthropic Claude.
 *
 * Summarizes the scanned graph + heuristic findings and asks the model for
 * additional, non-obvious failure predictions, constrained to a JSON schema.
 * Defaults to claude-opus-4-8 with adaptive thinking. Any failure (no key,
 * network, refusal, malformed output) resolves to an empty list so the caller
 * falls back to the deterministic heuristics.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  get enabled() {
    return true;
  }

  async predict(req: PredictRequest): Promise<Prediction[]> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        system:
          'You are a principal reliability engineer. Given a system dependency ' +
          'graph and known heuristic risks, predict NON-OBVIOUS future failure ' +
          'modes: bottlenecks, scaling cliffs, architectural and security risks ' +
          'that emerge as the system grows. Do not repeat the heuristics ' +
          'verbatim. Be specific and quantify the horizon where possible. ' +
          'Return only predictions that follow from the provided graph.',
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(req),
          },
        ],
        output_config: {
          format: {
            type: 'json_schema',
            schema: PREDICTION_SCHEMA as unknown as Record<string, unknown>,
          },
        },
      });

      if (response.stop_reason === 'refusal') {
        this.logger.warn('AI prediction refused by safety classifier.');
        return [];
      }

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return this.parse(text);
    } catch (err) {
      this.logger.warn(`AI prediction unavailable: ${(err as Error).message}`);
      return [];
    }
  }

  private buildPrompt(req: PredictRequest): string {
    // Send a compact, non-secret projection of the graph.
    const nodes = req.graph.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      provider: n.provider,
      redundant: n.redundant,
      hasBackup: n.hasBackup,
      hasRateLimit: n.hasRateLimit,
      requestsPerMinute: n.requestsPerMinute,
    }));
    const heuristics = req.heuristics.map((h) => h.title);
    return JSON.stringify(
      {
        currentUsers: req.currentUsers,
        nodes,
        edges: req.graph.edges,
        knownHeuristicRisks: heuristics,
      },
      null,
      2,
    );
  }

  private parse(text: string): Prediction[] {
    let parsed: { predictions?: unknown[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.warn('AI prediction output was not valid JSON.');
      return [];
    }
    const items = Array.isArray(parsed.predictions) ? parsed.predictions : [];
    return items.map((raw, i) => {
      const p = raw as Record<string, unknown>;
      return {
        id: `pred-ai-${i}`,
        category: (p.category as Prediction['category']) ?? 'architecture',
        severity: (p.severity as Prediction['severity']) ?? 'medium',
        title: String(p.title ?? 'Predicted risk'),
        horizon: String(p.horizon ?? 'as the system grows'),
        likelihood: clamp01(Number(p.likelihood ?? 0.5)),
        rationale: String(p.rationale ?? ''),
        recommendation: String(p.recommendation ?? ''),
        source: 'ai' as const,
      };
    });
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
