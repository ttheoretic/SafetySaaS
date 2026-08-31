import type { AiComponentSignal, CodeIssue, Severity, SystemNode } from '@riscly/shared';

/**
 * AI & AI-agent security analysis.
 *
 * Applications increasingly hand a language model the ability to read data and
 * take actions. That creates a class of risk the classic scanners don't look
 * for: untrusted text becoming an instruction, model output being executed, and
 * agents holding more authority than the user who triggered them.
 *
 * This pass does two things over the same file contents the code audit already
 * reads (no extra network cost):
 *   1. DISCOVERY — which models, agents and vector stores the code talks to, so
 *      they become first-class nodes in the architecture graph.
 *   2. RULES     — AI-specific security issues, located to a file and line.
 *
 * Everything here is pattern-based, so findings are tagged `heuristic`: they
 * point a human at the right line, they do not prove a vulnerability.
 */

/** An AI dependency discovered in the code, plus the files that evidence it. */
export interface AiComponent extends AiComponentSignal {
  /** Repo-relative files this component was detected in. */
  files: string[];
}

export interface AiAuditResult {
  components: AiComponent[];
  issues: CodeIssue[];
}

interface ProviderSignature {
  id: string;
  name: string;
  provider: SystemNode['provider'];
  re: RegExp;
}

/** Import/endpoint signatures that identify a model provider. */
const PROVIDERS: ProviderSignature[] = [
  {
    id: 'ai-openai',
    name: 'OpenAI',
    provider: 'openai',
    re: /(from\s+['"]openai['"]|require\(['"]openai['"]\)|api\.openai\.com|import\s+openai\b)/,
  },
  {
    id: 'ai-anthropic',
    name: 'Anthropic',
    provider: 'anthropic',
    re: /(@anthropic-ai\/sdk|api\.anthropic\.com|import\s+anthropic\b|from\s+anthropic\b)/,
  },
  {
    id: 'ai-google',
    name: 'Google AI',
    provider: 'google_ai',
    re: /(@google\/generative-ai|generativelanguage\.googleapis\.com|google\.generativeai)/,
  },
  {
    id: 'ai-mistral',
    name: 'Mistral',
    provider: 'mistral',
    re: /(@mistralai\/|api\.mistral\.ai|from\s+mistralai\b)/,
  },
  {
    id: 'ai-cohere',
    name: 'Cohere',
    provider: 'cohere',
    re: /(cohere-ai|api\.cohere\.ai|import\s+cohere\b)/,
  },
];

/** Vector / embedding stores backing retrieval. */
const VECTOR_STORES: { id: string; name: string; re: RegExp }[] = [
  { id: 'ai-pinecone', name: 'Pinecone', re: /(@pinecone-database|pinecone-client|api\.pinecone\.io)/ },
  { id: 'ai-weaviate', name: 'Weaviate', re: /weaviate-(ts-)?client|import\s+weaviate\b/ },
  { id: 'ai-qdrant', name: 'Qdrant', re: /@qdrant\/|qdrant-client/ },
  { id: 'ai-chroma', name: 'Chroma', re: /chromadb|@chroma-core\// },
  { id: 'ai-pgvector', name: 'pgvector', re: /\bpgvector\b|CREATE\s+EXTENSION\s+vector/i },
];

/**
 * Signals that the code doesn't merely *call* a model but lets it act: tool /
 * function definitions, or an agent framework's executor.
 */
const AGENT_RE =
  /(tool_choice|tools\s*:\s*\[|functions\s*:\s*\[|function_call|AgentExecutor|createAgent|createToolCallingAgent|initialize_agent|\.bindTools\(|@tool\b)/;

interface AiRule {
  rule: string;
  severity: Severity;
  title: string;
  description: string;
  re: RegExp;
  /** Only fire in files that already look AI-related. */
  requiresAi?: boolean;
}

const AI_RULES: AiRule[] = [
  {
    rule: 'ai/leaked-openai-key',
    severity: 'critical',
    title: 'OpenAI API key in source',
    description:
      'An OpenAI secret key is committed to the repository. Anyone with read access can spend against your account and read your usage. Rotate the key now and load it from the environment.',
    re: /\bsk-(proj-)?[A-Za-z0-9_-]{32,}\b/,
  },
  {
    rule: 'ai/leaked-anthropic-key',
    severity: 'critical',
    title: 'Anthropic API key in source',
    description:
      'An Anthropic API key is committed to the repository. Rotate it immediately and read it from the environment instead.',
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    rule: 'ai/unsafe-output-execution',
    severity: 'critical',
    title: 'Model output reaches an execution sink',
    description:
      'The text a model returns is passed to eval/exec/a shell. A prompt injection anywhere upstream — a support ticket, a scraped page, a PDF — then becomes code execution on your server. Never execute model output; map it to a fixed set of allowed operations instead.',
    re: /(eval|exec|execSync|spawnSync|child_process\.[a-z]+|Function)\s*\(\s*[^)]*\b(completion|response|message|choices|answer|output|result)\b/i,
    requiresAi: true,
  },
  {
    rule: 'ai/model-generated-sql',
    severity: 'critical',
    title: 'Model output used to build a database query',
    description:
      'A query is constructed from model output. Whoever can influence the prompt can influence the query — including reading or deleting rows they do not own. Constrain the model to parameters, not SQL, and run the query with a least-privilege role.',
    re: /(query|execute|raw|\$queryRawUnsafe)\s*\(\s*[^)]*\b(completion|response|message|choices|answer|output|llm|model)\b/i,
    requiresAi: true,
  },
  {
    rule: 'ai/prompt-injection-surface',
    severity: 'high',
    title: 'Untrusted input concatenated into a prompt',
    description:
      'User-controlled text is interpolated straight into the prompt, so a user can write instructions the model will follow. Keep untrusted text in a clearly delimited block, restate the rules after it, and never rely on the system prompt alone to hold.',
    re: /(prompt|messages|system|content)\s*[:=][^\n]*(\$\{\s*(req|request|input|user|body|query|params|msg|message)\b|\+\s*(req|request|input|user|body|query|params)\b|f["'][^"']*\{(input|user|query|message))/i,
    requiresAi: true,
  },
  {
    rule: 'ai/sensitive-data-in-prompt',
    severity: 'high',
    title: 'Sensitive data sent to a model',
    description:
      'Values that look like credentials or personal data are placed into a prompt. They leave your infrastructure, may be retained by the provider, and can resurface in a later completion. Redact before the call.',
    re: /(prompt|messages|content|input)\s*[:=][^\n]*\b(password|passwd|secret|api_?key|token|ssn|social_?security|credit_?card|card_?number|iban)\b/i,
    requiresAi: true,
  },
  {
    rule: 'ai/excessive-agency',
    severity: 'high',
    title: 'Agent tool performs destructive or privileged actions',
    description:
      'A tool exposed to the model can write, delete or run commands. A model that is talked into calling it does so with your application’s full authority. Scope the tool to the acting user, make destructive operations require explicit human approval, and log every call.',
    re: /(name\s*:\s*['"][^'"]*(delete|drop|remove|write|update|refund|payout|transfer|shell|exec|admin)[^'"]*['"]|def\s+\w*(delete|drop|write|refund|transfer)\w*\s*\()/i,
    requiresAi: true,
  },
  {
    rule: 'ai/unvalidated-tool-arguments',
    severity: 'medium',
    title: 'Tool arguments used without validation',
    description:
      'Arguments produced by the model are parsed and used directly. Model output is untrusted input: validate it against a schema and re-check the caller’s permission before acting on it.',
    re: /JSON\.parse\s*\(\s*[^)]*\b(arguments|tool_calls|function_call|tool_input)\b/i,
    requiresAi: true,
  },
  {
    rule: 'ai/indirect-injection-rag',
    severity: 'medium',
    title: 'Retrieved documents injected into the prompt unguarded',
    description:
      'Retrieved content is inserted into the prompt without separation. Anyone who can get a document into your index — a public page, an uploaded file, a shared ticket — can plant instructions for the model. Delimit retrieved text and mark it as data, never as instructions.',
    re: /(context|documents|chunks|retrieved|results)\s*\.\s*(join|map)\s*\([^)]*\)[^\n]*(prompt|messages|content)/i,
    requiresAi: true,
  },
  {
    rule: 'ai/no-timeout',
    severity: 'low',
    title: 'Model call without a timeout',
    description:
      'A model call with no timeout can hold a request open for minutes when the provider degrades, exhausting your connection pool. Set an explicit timeout and a fallback path.',
    re: /\.(chat|completions|messages|generateContent)\b[^\n]*\.create\s*\(\s*\{(?![^}]*timeout)/i,
    requiresAi: true,
  },
];

/** Files whose content shows any AI usage at all. */
function looksAiRelated(content: string): boolean {
  return (
    PROVIDERS.some((p) => p.re.test(content)) ||
    /\b(langchain|llamaindex|openai|anthropic|claude|gpt-4|gpt-5|gemini|llm|embedding)\b/i.test(
      content,
    )
  );
}

const MAX_MATCHES_PER_RULE_PER_FILE = 3;

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

/** Trim a source line for display without leaking a whole secret. */
function snippetAt(content: string, line: number, rule: string): string {
  const raw = content.split('\n')[line - 1] ?? '';
  const text = raw.trim().slice(0, 200);
  if (!rule.startsWith('ai/leaked-')) return text;
  // Never echo a live key back into the findings payload.
  return text.replace(/\b(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, '$1…redacted');
}

/**
 * Analyse already-fetched file contents for AI usage and AI-specific risks.
 * Pure: same inputs, same result.
 */
export function analyzeAi(
  contents: Array<{ path: string; content: string | undefined }>,
): AiAuditResult {
  const components = new Map<string, AiComponent>();
  const issues: CodeIssue[] = [];

  const add = (c: Omit<AiComponent, 'files'>, file: string) => {
    const existing = components.get(c.id);
    if (existing) {
      if (!existing.files.includes(file)) existing.files.push(file);
      return;
    }
    components.set(c.id, { ...c, files: [file] });
  };

  for (const { path, content } of contents) {
    if (!content) continue;

    // --- discovery ---------------------------------------------------------
    for (const p of PROVIDERS) {
      if (p.re.test(content)) {
        add({ id: p.id, kind: 'ai_model', name: p.name, provider: p.provider }, path);
      }
    }
    for (const v of VECTOR_STORES) {
      if (v.re.test(content)) add({ id: v.id, kind: 'vector_store', name: v.name }, path);
    }

    const aiFile = looksAiRelated(content);
    if (aiFile && AGENT_RE.test(content)) {
      add({ id: 'ai-agent', kind: 'ai_agent', name: 'AI agent (tool calling)' }, path);
    }

    // --- rules -------------------------------------------------------------
    for (const rule of AI_RULES) {
      if (rule.requiresAi && !aiFile) continue;
      const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
      let match: RegExpExecArray | null;
      let hits = 0;
      while ((match = re.exec(content)) !== null && hits < MAX_MATCHES_PER_RULE_PER_FILE) {
        hits++;
        const line = lineOf(content, match.index);
        issues.push({
          id: `${rule.rule}:${path}:${line}`,
          file: path,
          line,
          rule: rule.rule,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          snippet: snippetAt(content, line, rule.rule),
          confidence: 'heuristic',
        });
        if (match.index === re.lastIndex) re.lastIndex++;
      }
    }
  }

  // De-dup by stable id (the same line can match twice on overlapping rules).
  const seen = new Set<string>();
  return {
    components: [...components.values()],
    issues: issues.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true))),
  };
}
