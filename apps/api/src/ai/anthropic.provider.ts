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
  OnUsage,
  PredictRequest,
  PREDICTION_SCHEMA,
  RefactorPlanRequest,
  RefactorPlanResult,
} from './ai-provider';

/** Net bracket balance ( '{' - '}', etc.) of a chunk of code, ignoring the
 *  contents of strings only loosely — good enough to detect a truncated or
 *  garbled rewrite that would unbalance the surrounding file. */
function bracketBalance(s: string): { curly: number; paren: number; square: number } {
  let curly = 0;
  let paren = 0;
  let square = 0;
  for (const ch of s) {
    if (ch === '{') curly++;
    else if (ch === '}') curly--;
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') square++;
    else if (ch === ']') square--;
  }
  return { curly, paren, square };
}

/**
 * Whether an AI-rewritten window is safe to splice back into the file. Rejects
 * obviously-broken rewrites — empty, truncated (far shorter than the original),
 * or one that changes the net bracket balance (which would corrupt the file
 * structure once spliced). A conservative gate: it can reject a valid fix, but
 * it must never let a corrupting one through.
 */
export function isSafeRewrite(original: string, rewritten: string): boolean {
  if (!rewritten.trim()) return false;
  // Truncation guard: a real fix stays roughly the same size. Allow generous
  // shrink/grow but reject a rewrite that collapsed to a fragment.
  if (rewritten.length < original.length * 0.3) return false;
  // Structural guard: net bracket balance must be preserved so the splice
  // doesn't leave the file unbalanced. (No-op for brace-less languages.)
  const a = bracketBalance(original);
  const b = bracketBalance(rewritten);
  return a.curly === b.curly && a.paren === b.paren && a.square === b.square;
}

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

  /** Forward a call's real token usage to the request's optional sink. */
  private report(
    onUsage: OnUsage | undefined,
    model: string,
    response: { usage?: { input_tokens?: number; output_tokens?: number } },
    startedAt: number,
  ): void {
    if (!onUsage) return;
    try {
      onUsage({
        model,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        latencyMs: Date.now() - startedAt,
      });
    } catch {
      /* never let usage recording break a call */
    }
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
      const t0 = Date.now();
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

      this.report(req.onUsage, model, response, t0);
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
      const t0 = Date.now();
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

      this.report(req.onUsage, model, response, t0);
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
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 2048 : tier === 'sonnet' ? 4096 : 8192;

      // Only rewrite a WINDOW around the affected region. For small files that's
      // the whole file (unchanged behaviour); for large files (e.g. a big
      // maintainability hotspot) it's a bounded slice around the issue, so the
      // fix stays feasible and the diff is localized. The window is spliced back
      // into the full file before returning.
      const lines = req.content.split('\n');
      const large = req.content.length > 20_000;
      let start = 0;
      let end = lines.length; // exclusive
      if (large) {
        const line0 = Math.max(0, (req.line || 1) - 1);
        const endL = Math.max(line0, (req.endLine || req.line || 1) - 1);
        const CTX = 40;
        const MAX_WIN = 400;
        start = Math.max(0, line0 - CTX);
        end = Math.min(lines.length, endL + 1 + CTX);
        if (end - start > MAX_WIN) end = start + MAX_WIN;
      }
      const windowText = lines.slice(start, end).join('\n');
      // Even a bounded window can be pathologically long; bail rather than fail.
      if (windowText.length > 24_000) return null;
      const isExcerpt = large && (start > 0 || end < lines.length);

      const t0 = Date.now();
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system:
          'You are a senior engineer fixing exactly one issue in one file. Reply ' +
          'with (1) a single short sentence explaining the fix, then (2) the ' +
          'COMPLETE corrected code for the SHOWN snippet inside one fenced code ' +
          'block. Preserve the surrounding indentation and return the whole ' +
          'snippet (not just the changed lines). Change only what is needed to ' +
          'resolve the issue — never invent unrelated edits. For committed ' +
          'secrets, remove the literal value and read it from an environment ' +
          'variable.',
        messages: [
          {
            role: 'user',
            content:
              `Issue: ${req.title} (rule ${req.rule}) at ${req.file}:${req.line}\n` +
              `${req.description}\n\n` +
              (isExcerpt
                ? `Code to fix (lines ${start + 1}-${end} of ${req.file}):\n`
                : `File (${req.file}):\n`) +
              `\`\`\`\n${windowText}\n\`\`\``,
          },
        ],
      });
      this.report(req.onUsage, model, response, t0);
      if (response.stop_reason === 'refusal') return null;
      // A truncated response (hit the output cap) would splice a half-written
      // window into the file — never offer that as a fix.
      if (response.stop_reason === 'max_tokens') return null;
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const fenced = text.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/);
      if (!fenced) return null;
      const fixedWindow = fenced[1].replace(/\n$/, '');
      // Guard against a malformed rewrite corrupting the file when spliced.
      if (!isSafeRewrite(windowText, fixedWindow)) return null;
      // Splice the corrected window back into the full file.
      const fixed = isExcerpt
        ? [...lines.slice(0, start), ...fixedWindow.split('\n'), ...lines.slice(end)].join('\n')
        : fixedWindow;
      const explanation =
        text.slice(0, text.indexOf('```')).trim() || 'Applied the recommended fix.';
      return { fixed, explanation };
    } catch (err) {
      this.logger.warn(`AI code fix unavailable: ${(err as Error).message}`);
      return null;
    }
  }

  async generateRefactorPlan(req: RefactorPlanRequest): Promise<RefactorPlanResult | null> {
    try {
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 1500 : tier === 'sonnet' ? 2500 : 3500;
      // We only READ the file, so we can accept large hotspots — bound the input
      // for cost and note when it was truncated.
      const LIMIT = 48_000;
      const truncated = req.content.length > LIMIT;
      const source = truncated ? req.content.slice(0, LIMIT) : req.content;
      // Number the lines so the plan can cite exact locations.
      const numbered = source
        .split('\n')
        .map((l, i) => `${i + 1}: ${l}`)
        .join('\n');
      const t0 = Date.now();
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system:
          'You are a senior engineer improving the MAINTAINABILITY of one file. ' +
          'Do NOT rewrite the whole file. Instead produce a concrete, prioritized ' +
          'refactoring plan as GitHub-flavored markdown: a one-line summary, then ' +
          'an ordered list of specific steps. Each step must cite the exact ' +
          'function name and line range it applies to, say what to do (extract a ' +
          'function, flatten nesting with early returns, split the file, resolve a ' +
          'TODO, remove dead code, add a test), and why. Where a short before/after ' +
          'snippet (a few lines) makes it concrete, include one in a fenced code ' +
          'block. Order steps by impact-to-effort. Keep it actionable and specific ' +
          'to this file — no generic advice.',
        messages: [
          {
            role: 'user',
            content:
              `File: ${req.file}\nMaintainability signals: ${req.metrics}\n` +
              (truncated ? `(Only the first ${LIMIT} characters are shown.)\n` : '') +
              `\nSource (line-numbered):\n\`\`\`\n${numbered}\n\`\`\``,
          },
        ],
      });
      this.report(req.onUsage, model, response, t0);
      if (response.stop_reason === 'refusal') return null;
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (!text) return null;
      const plan = truncated
        ? `${text}\n\n_Note: only the first ${LIMIT.toLocaleString()} characters of the file were analysed._`
        : text;
      return { plan };
    } catch (err) {
      this.logger.warn(`AI refactor plan unavailable: ${(err as Error).message}`);
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
      const t0 = Date.now();
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
      this.report(req.onUsage, model, response, t0);
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

  async analyzeMaintainability(req: CodeAnalysisRequest): Promise<AnalyzedIssue[]> {
    try {
      if (!req.content.trim()) return [];
      const model = req.model ?? this.model;
      const tier = req.tier ?? 'opus';
      const maxTokens = tier === 'basic' ? 1500 : tier === 'sonnet' ? 3000 : 4000;
      // Read up to a bounded slice (issues located within it still map to real
      // line numbers since we slice from the start). Output is a compact list.
      const LIMIT = 48_000;
      const source = req.content.length > LIMIT ? req.content.slice(0, LIMIT) : req.content;
      const numbered = source
        .split('\n')
        .map((l, i) => `${i + 1}: ${l}`)
        .join('\n');
      const t0 = Date.now();
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system:
          'You are a senior engineer reviewing a file for MAINTAINABILITY ' +
          'problems — code that is hard to change and likely to cause future ' +
          'defects: overly long or complex functions, deeply nested blocks, ' +
          'duplicated logic, dead code, a file that should be split, and ' +
          'unresolved TODO/FIXME. For each, give the EXACT line range it spans. ' +
          'Report only concrete, actionable regions — no style nitpicks. Respond ' +
          'with a single JSON array (no prose) of objects: { "line": number, ' +
          '"endLine": number, "severity": "low"|"medium"|"high"|"critical", ' +
          '"rule": string (e.g. "quality/long-function", "quality/deep-nesting", ' +
          '"quality/duplication", "quality/dead-code", "quality/todo"), "title": ' +
          'string, "description": string (say concretely what to do) }. Empty ' +
          'array if the file is clean.',
        messages: [{ role: 'user', content: `File: ${req.file}\n\n${numbered}` }],
      });
      this.report(req.onUsage, model, response, t0);
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
          endLine:
            typeof i.endLine === 'number' ? Math.max(i.line, Math.floor(i.endLine)) : undefined,
          severity: ['low', 'medium', 'high', 'critical'].includes(i.severity)
            ? i.severity
            : 'medium',
          rule: i.rule || 'quality/maintainability',
          title: String(i.title).slice(0, 200),
          description: String(i.description ?? '').slice(0, 600),
        }));
    } catch (err) {
      this.logger.warn(`AI maintainability analysis unavailable: ${(err as Error).message}`);
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
