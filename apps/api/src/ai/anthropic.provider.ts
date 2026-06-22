import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { Prediction } from '@riscly/shared';
import {
  AiProvider,
  AnalyzedIssue,
  ChatRequest,
  CodeAnalysisRequest,
  CodeFixRequest,
  CodeFixResult,
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
      // Per-plan model: higher tiers get a stronger model, a larger token
      // budget and an instruction to produce deeper, more actionable fixes.
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 1500 : tier === 'sonnet' ? 3000 : 4096;
      const depthHint =
        tier === 'basic'
          ? 'Return up to 4 concise predictions with a one-line fix each.'
          : tier === 'sonnet'
            ? 'Return up to 8 predictions with concrete, step-by-step fixes.'
            : 'Return a thorough set of predictions with detailed, ' +
              'prioritized remediation plans and quantified horizons.';
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        thinking: { type: 'adaptive' },
        system:
          'You are a principal reliability engineer. Given a system dependency ' +
          'graph and known heuristic risks, predict NON-OBVIOUS future failure ' +
          'modes: bottlenecks, scaling cliffs, architectural and security risks ' +
          'that emerge as the system grows. Do not repeat the heuristics ' +
          'verbatim. Be specific and quantify the horizon where possible. ' +
          'Return only predictions that follow from the provided graph. ' +
          depthHint,
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

  async chat(req: ChatRequest): Promise<string> {
    try {
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 1024 : tier === 'sonnet' ? 2048 : 3072;
      const context = JSON.stringify(
        {
          nodes: req.graph.nodes.map((n) => ({
            id: n.id,
            kind: n.kind,
            provider: n.provider,
            redundant: n.redundant,
            hasBackup: n.hasBackup,
            hasRateLimit: n.hasRateLimit,
          })),
          edges: req.graph.edges,
          knownRisks: req.heuristics.map((h) => ({
            title: h.title,
            severity: h.severity,
            recommendation: h.recommendation,
          })),
        },
        null,
        2,
      );
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system:
          'You are Riscly, an expert reliability, security and business-risk ' +
          'assistant. Answer the user\'s questions about THEIR system using the ' +
          'architecture graph and known risks provided as JSON below. Be ' +
          'concrete, prioritize by impact, and give actionable fixes. If the ' +
          'answer is not derivable from their system, say so briefly. Keep ' +
          'answers tight and skimmable (short paragraphs or bullets).\n\n' +
          `System context:\n${context}`,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (response.stop_reason === 'refusal') {
        return 'I can’t help with that request.';
      }
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return text || 'I don’t have an answer for that based on your current scan.';
    } catch (err) {
      this.logger.warn(`AI chat unavailable: ${(err as Error).message}`);
      return 'The assistant is temporarily unavailable. Please try again in a moment.';
    }
  }

  async generateCodeFix(req: CodeFixRequest): Promise<CodeFixResult | null> {
    try {
      // Bound the file we send so a fix is feasible and cheap.
      if (req.content.length > 24_000) return null;
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 2048 : tier === 'sonnet' ? 4096 : 8192;
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system:
          'You are a senior security engineer fixing exactly one issue in one ' +
          'file. Reply with (1) a single short sentence explaining the fix, then ' +
          '(2) the COMPLETE corrected file inside one fenced code block. Change ' +
          'only what is needed to resolve the issue — never invent unrelated ' +
          'edits. For committed secrets, remove the literal value and read it ' +
          'from an environment variable.',
        messages: [
          {
            role: 'user',
            content:
              `Issue: ${req.title} (rule ${req.rule}) at ${req.file}:${req.line}\n` +
              `${req.description}\n\nFile (${req.file}):\n\`\`\`\n${req.content}\n\`\`\``,
          },
        ],
      });
      if (response.stop_reason === 'refusal') return null;
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const fenced = text.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/);
      if (!fenced) return null;
      const fixed = fenced[1].replace(/\n$/, '');
      const explanation =
        text.slice(0, text.indexOf('```')).trim() || 'Applied the recommended fix.';
      return { fixed, explanation };
    } catch (err) {
      this.logger.warn(`AI code fix unavailable: ${(err as Error).message}`);
      return null;
    }
  }

  async analyzeCode(req: CodeAnalysisRequest): Promise<AnalyzedIssue[]> {
    try {
      if (!req.content.trim() || req.content.length > 20_000) return [];
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 1500 : tier === 'sonnet' ? 3000 : 4000;
      // Number the lines so the model can cite exact locations.
      const numbered = req.content
        .split('\n')
        .map((l, i) => `${i + 1}: ${l}`)
        .join('\n');
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system:
          'You are a senior security + code-quality reviewer. Analyse the file ' +
          'for real issues: security vulnerabilities, correctness bugs, risky ' +
          'patterns, and clear code-quality problems. Report ONLY concrete, ' +
          'actionable issues — no style nitpicks, no speculation. Respond with a ' +
          'single JSON array (no prose) of objects: ' +
          '{ "line": number, "endLine"?: number, "severity": ' +
          '"low"|"medium"|"high"|"critical", "rule": string (e.g. ' +
          '"security/sql-injection", "quality/dead-code"), "title": string, ' +
          '"description": string }. Empty array if the file is clean.',
        messages: [
          {
            role: 'user',
            content: `File: ${req.file}\n\n${numbered}`,
          },
        ],
      });
      if (response.stop_reason === 'refusal') return [];
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
      if (!json) return [];
      const parsed = JSON.parse(json) as AnalyzedIssue[];
      return parsed
        .filter((i) => i && typeof i.line === 'number' && i.title)
        .map((i) => ({
          line: Math.max(1, Math.floor(i.line)),
          endLine: i.endLine,
          severity: ['low', 'medium', 'high', 'critical'].includes(i.severity)
            ? i.severity
            : 'medium',
          rule: i.rule || 'ai/issue',
          title: String(i.title).slice(0, 200),
          description: String(i.description ?? '').slice(0, 600),
        }));
    } catch (err) {
      this.logger.warn(`AI code analysis unavailable: ${(err as Error).message}`);
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
