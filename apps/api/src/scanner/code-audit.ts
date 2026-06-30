import { Logger } from '@nestjs/common';
import type { CodeIssue, Finding, Severity, QualityHotspot, QualitySummary } from '@riscly/shared';
import { resilientFetch, mapWithConcurrency, CollectorContext } from './collectors/collector';
import { analyzeJsAst, isJsLike, AST_OWNED_RULES } from './ast-audit';
import { verifySecrets } from './secret-verify';
import { analyzeQuality } from './code-quality';

/** Max source files read in parallel — bounds the request fan-out on big repos. */
const READ_CONCURRENCY = 8;

/**
 * Code-level analysis (lightweight SAST). Scans a repo's source files for common
 * security vulnerabilities and risky patterns — code injection, SQL injection,
 * XSS, disabled TLS verification, insecure deserialization, weak crypto, missing
 * timeouts, hardcoded secrets, committed secret files, insecure Docker config —
 * locating each to a file + line so the code view can show the affected regions
 * and an AI can propose a fix.
 *
 * Bounded by design: one tree listing + a capped set of source-file reads, so a
 * scan stays fast and never fans out across an unbounded codebase.
 */
const MAX_FILE_READS = 60;
const MAX_FILE_BYTES = 200_000;
const MAX_ISSUES_PER_FILE = 25;
const MAX_MATCHES_PER_RULE_PER_FILE = 5;

const logger = new Logger('CodeAudit');

type Lang = 'js' | 'py' | 'go' | 'rb' | 'php' | 'java' | 'other';

const SOURCE_EXT = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx',
  'py', 'go', 'rb', 'php', 'java', 'cs', 'rs', 'kt', 'scala',
]);

const EXCLUDE_DIR =
  /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|\.git|vendor|third_party|coverage|__pycache__|\.venv|venv|env|migrations|generated|\.turbo|target|bin|obj|\.cache)\//;

function langOf(path: string): Lang {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext)) return 'js';
  if (ext === 'py') return 'py';
  if (ext === 'go') return 'go';
  if (ext === 'rb') return 'rb';
  if (ext === 'php') return 'php';
  if (ext === 'java') return 'java';
  return 'other';
}

interface SecretRule { rule: string; name: string; re: RegExp; severity: Severity }

// Classic, low-false-positive secret signatures (scanned in every read file).
const SECRET_RULES: SecretRule[] = [
  { rule: 'secret/aws-access-key', name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
  { rule: 'secret/stripe-live-key', name: 'Stripe live secret key', re: /sk_live_[0-9a-zA-Z]{20,}/, severity: 'critical' },
  { rule: 'secret/github-pat', name: 'GitHub personal access token', re: /\b(ghp|gho|ghs)_[0-9A-Za-z]{36}\b/, severity: 'critical' },
  { rule: 'secret/github-fine-grained', name: 'GitHub fine-grained token', re: /github_pat_[0-9A-Za-z_]{40,}/, severity: 'critical' },
  { rule: 'secret/google-api-key', name: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/, severity: 'high' },
  { rule: 'secret/slack-token', name: 'Slack token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/, severity: 'high' },
  { rule: 'secret/private-key', name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, severity: 'critical' },
  { rule: 'secret/stripe-test-key', name: 'Stripe test secret key', re: /sk_test_[0-9a-zA-Z]{20,}/, severity: 'medium' },
  { rule: 'secret/hardcoded-credential', name: 'hardcoded credential', re: /(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, severity: 'medium' },
];

interface CodeRule {
  rule: string;
  severity: Severity;
  title: string;
  description: string;
  re: RegExp;
  /** Languages this rule applies to; omitted = all. */
  langs?: Lang[];
}

// High-signal, source-level vulnerability & quality rules (scanned per line).
const CODE_RULES: CodeRule[] = [
  // --- JavaScript / TypeScript ---
  { rule: 'js/eval', severity: 'high', langs: ['js'], re: /\beval\s*\(/, title: 'Use of eval()', description: '`eval()` executes arbitrary code — a code-injection risk. Replace it with explicit logic or a safe parser.' },
  { rule: 'js/new-function', severity: 'high', langs: ['js'], re: /\bnew\s+Function\s*\(/, title: 'Dynamic code via new Function()', description: '`new Function()` runs arbitrary code from a string. Avoid constructing functions from dynamic input.' },
  { rule: 'js/inner-html', severity: 'medium', langs: ['js'], re: /dangerouslySetInnerHTML|\.innerHTML\s*=/, title: 'Raw HTML injection (XSS risk)', description: 'Assigning raw HTML can introduce XSS. Sanitize the input or render it as text.' },
  { rule: 'js/tls-disabled', severity: 'high', langs: ['js'], re: /rejectUnauthorized\s*:\s*false/, title: 'TLS verification disabled', description: '`rejectUnauthorized: false` disables certificate validation and enables MITM attacks. Keep TLS verification on.' },
  { rule: 'js/cors-wildcard', severity: 'medium', langs: ['js'], re: /origin\s*:\s*['"`]\*['"`]/, title: 'Permissive CORS (origin *)', description: 'Allowing any origin exposes the API to cross-site requests. Restrict to known origins.' },
  { rule: 'js/jwt-none', severity: 'critical', langs: ['js'], re: /algorithms?\s*:\s*\[\s*['"]none['"]/i, title: "JWT 'none' algorithm allowed", description: 'Accepting the `none` algorithm lets attackers forge tokens. Pin a strong algorithm (RS256/HS256).' },
  { rule: 'js/sql-injection', severity: 'high', langs: ['js'], re: /(query|execute|raw)\s*\(\s*[`'"][^`'"]*(SELECT|INSERT|UPDATE|DELETE|FROM)[^`'"]*(\$\{|['"`]\s*\+)/i, title: 'Possible SQL injection', description: 'A SQL query is built with string concatenation/interpolation. Use parameterized queries / prepared statements.' },
  { rule: 'js/weak-random', severity: 'medium', langs: ['js'], re: /(token|secret|password|api[_-]?key|otp|nonce)[^\n]*Math\.random|Math\.random[^\n]*(token|secret|password|api[_-]?key|otp|nonce)/i, title: 'Weak randomness for a secret', description: '`Math.random()` is not cryptographically secure. Use `crypto.randomBytes`/`crypto.getRandomValues` for tokens.' },
  // --- Python ---
  { rule: 'py/eval-exec', severity: 'high', langs: ['py'], re: /\b(eval|exec)\s*\(/, title: 'Use of eval()/exec()', description: '`eval`/`exec` run arbitrary code — a code-injection risk on dynamic input.' },
  { rule: 'py/shell-true', severity: 'high', langs: ['py'], re: /subprocess\.[A-Za-z_]+\([^)]*shell\s*=\s*True/, title: 'subprocess with shell=True', description: '`shell=True` enables command injection when the command includes untrusted input. Pass an argument list instead.' },
  { rule: 'py/pickle', severity: 'high', langs: ['py'], re: /pickle\.loads?\s*\(/, title: 'Insecure deserialization (pickle)', description: '`pickle.load(s)` can execute arbitrary code on crafted input. Use a safe format (JSON) for untrusted data.' },
  { rule: 'py/yaml-load', severity: 'high', langs: ['py'], re: /yaml\.load\s*\((?:(?!Loader\s*=)[^)])*\)/, title: 'yaml.load without SafeLoader', description: '`yaml.load` without `SafeLoader` can execute arbitrary code. Use `yaml.safe_load`.' },
  { rule: 'py/requests-timeout', severity: 'medium', langs: ['py'], re: /requests\.(get|post|put|delete|patch|head)\s*\((?:(?!timeout\s*=)[^)])*\)/, title: 'HTTP request without timeout', description: 'A request without `timeout=` can hang indefinitely and exhaust workers. Always set a timeout.' },
  { rule: 'py/verify-false', severity: 'high', langs: ['py'], re: /verify\s*=\s*False/, title: 'TLS verification disabled (verify=False)', description: '`verify=False` disables certificate validation and enables MITM. Keep verification on.' },
  { rule: 'py/debug-true', severity: 'medium', langs: ['py'], re: /\bdebug\s*=\s*True/i, title: 'Debug mode enabled', description: 'Debug mode can leak stack traces and allow code execution. Disable it in production.' },
  { rule: 'py/weak-hash', severity: 'low', langs: ['py'], re: /hashlib\.(md5|sha1)\s*\(/, title: 'Weak hash (md5/sha1)', description: 'md5/sha1 are weak for security use. Use SHA-256+ or a password hash (bcrypt/argon2).' },
  { rule: 'py/sql-fstring', severity: 'high', langs: ['py'], re: /execute\s*\(\s*f['"][^'"]*(SELECT|INSERT|UPDATE|DELETE|FROM)/i, title: 'SQL via f-string (injection)', description: 'Building SQL with an f-string allows injection. Use parameterized queries.' },
  // --- Go ---
  { rule: 'go/tls-insecure', severity: 'high', langs: ['go'], re: /InsecureSkipVerify\s*:\s*true/, title: 'TLS verification disabled (InsecureSkipVerify)', description: '`InsecureSkipVerify: true` disables certificate validation. Keep it false in production.' },
  { rule: 'go/cmd-injection', severity: 'high', langs: ['go'], re: /exec\.Command\s*\([^)]*\+/, title: 'Possible command injection', description: 'A command is built with string concatenation. Pass arguments explicitly and validate input.' },
  // --- Any language: quality / maintainability ---
  { rule: 'quality/todo', severity: 'low', re: /\b(FIXME|XXX|HACK)\b/, title: 'Unresolved FIXME/HACK marker', description: 'A FIXME/HACK marker indicates known incomplete or fragile code. Track and resolve it.' },
];

// Committed files that should essentially never be in source control.
const SECRET_FILE_RULES: Array<{ rule: string; re: RegExp; label: string; severity: Severity }> = [
  { rule: 'secret-file/env', re: /(^|\/)\.env(\.(local|production|prod|development|dev|staging))?$/, label: 'environment file with secrets', severity: 'high' },
  { rule: 'secret-file/ssh-key', re: /(^|\/)id_rsa$/, label: 'SSH private key', severity: 'critical' },
  { rule: 'secret-file/cert', re: /\.(pem|pfx|p12)$/, label: 'private key / certificate', severity: 'high' },
  { rule: 'secret-file/credentials', re: /(^|\/)credentials\.json$/, label: 'credentials file', severity: 'high' },
  { rule: 'secret-file/service-account', re: /serviceaccount.*\.json$/i, label: 'service-account key', severity: 'critical' },
  { rule: 'secret-file/pgpass', re: /(^|\/)\.pgpass$/, label: 'database password file', severity: 'high' },
];

const weightOf = (severity: Severity): number =>
  severity === 'critical' ? 22 : severity === 'high' ? 14 : severity === 'medium' ? 8 : 3;

function issue(opts: {
  file: string; line: number; endLine?: number; rule: string;
  severity: Severity; title: string; description: string; snippet?: string;
}): CodeIssue {
  return {
    id: `${opts.rule}:${opts.file}:${opts.line}`,
    file: opts.file,
    line: opts.line,
    endLine: opts.endLine,
    rule: opts.rule,
    severity: opts.severity,
    title: opts.title,
    description: opts.description,
    snippet: opts.snippet,
  };
}

/** Derive the topology Finding from a located code issue. */
function findingFromIssue(i: CodeIssue): Finding {
  return {
    category: 'security',
    severity: i.severity,
    title: i.title,
    description: i.description,
    weight: weightOf(i.severity),
    rule: i.rule,
    file: i.file,
    line: i.line,
    confidence: i.confidence,
  };
}

async function ghGet(repo: string, path: string, ctx: CollectorContext): Promise<Response | undefined> {
  try {
    return await resilientFetch(ctx.fetchImpl, `https://api.github.com/repos/${repo}/${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'riscly-scanner',
        ...(ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}),
      },
    });
  } catch {
    return undefined;
  }
}

async function readFile(repo: string, path: string, ctx: CollectorContext): Promise<string | undefined> {
  const res = await ghGet(repo, `contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, ctx);
  if (!res || !res.ok) return undefined;
  const body = (await res.json()) as { content?: string; encoding?: string; size?: number };
  if (!body.content || (body.size ?? 0) > MAX_FILE_BYTES) return undefined;
  return Buffer.from(body.content, (body.encoding as BufferEncoding) ?? 'base64').toString('utf8');
}

/** List every path in the repo's default branch in a single tree request. */
async function listTree(repo: string, ctx: CollectorContext): Promise<string[]> {
  const res = await ghGet(repo, 'git/trees/HEAD?recursive=1', ctx);
  if (!res || !res.ok) return [];
  const body = (await res.json()) as { tree?: Array<{ path?: string; type?: string }> };
  return (body.tree ?? []).filter((t) => t.type === 'blob' && t.path).map((t) => t.path as string);
}

function isExampleEnv(path: string): boolean {
  return /\.(example|sample|template|dist)$/i.test(path) || /example|sample|template/i.test(path);
}

/** Scan a Dockerfile for common insecure-configuration patterns (line-located). */
function auditDockerfile(file: string, content: string): CodeIssue[] {
  const out: CodeIssue[] = [];
  const lines = content.split('\n');
  const fromIdx = lines.findIndex((l) => /^\s*FROM\s+/i.test(l));
  const from = fromIdx >= 0 ? lines[fromIdx] : undefined;
  if (from && (/:latest\b/i.test(from) || !/:/.test(from.replace(/\s+AS\s+\w+/i, '')))) {
    out.push(issue({ file, line: fromIdx + 1, rule: 'docker/unpinned-base-image', severity: 'low', title: 'Dockerfile uses an unpinned base image', description: 'The base image is `:latest` or untagged, so builds are non-reproducible and may pull in unexpected/vulnerable images. Pin a specific version/digest.', snippet: from.trim().slice(0, 200) }));
  }
  const hasUser = lines.some((l) => /^\s*USER\s+(?!root\b)\S+/i.test(l));
  if (!hasUser) {
    out.push(issue({ file, line: fromIdx >= 0 ? fromIdx + 1 : 1, rule: 'docker/root-user', severity: 'medium', title: 'Container runs as root', description: 'No non-root `USER` is set in the Dockerfile, so the container runs as root — a privilege-escalation risk if the app is compromised. Add a dedicated `USER`.' }));
  }
  const secretIdx = lines.findIndex((l) => /^\s*(ENV|ARG)\s+.*(SECRET|PASSWORD|TOKEN|API_?KEY|PRIVATE_?KEY)\s*=\s*\S+/i.test(l));
  if (secretIdx >= 0) {
    out.push(issue({ file, line: secretIdx + 1, rule: 'docker/baked-secret', severity: 'high', title: 'Secret baked into the Docker image', description: 'A secret-looking value is set via `ENV`/`ARG` in the Dockerfile; it gets embedded in image layers. Inject secrets at runtime instead.', snippet: lines[secretIdx].trim().slice(0, 200) }));
  }
  return out;
}

/**
 * Mask the secret matched by `re` in a line so we never persist the raw
 * credential — a security product must not store customers' secrets. Keeps a
 * short hint (first 3 / last 2 chars of long values) so the user can locate it.
 */
export function redactSecret(line: string, re: RegExp): string {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  return line
    .replace(new RegExp(re.source, flags), (m) =>
      m.length <= 6 ? '••••' : `${m.slice(0, 3)}••••${m.slice(-2)}`,
    )
    .trim();
}

/** Run the secret + code rule set over one file's contents (line-located).
 *  `skipRules` lets the AST pass own certain rules for JS/TS (no duplicates). */
function auditFileContent(file: string, content: string, skipRules?: Set<string>): CodeIssue[] {
  const out: CodeIssue[] = [];
  const lines = content.split('\n');
  const lang = langOf(file);
  const perRule = new Map<string, number>();

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (line.length > 1000) continue; // skip minified / generated lines
    // Secrets (any file type) — store a REDACTED snippet, never the raw secret.
    for (const r of SECRET_RULES) {
      if (r.re.test(line)) {
        out.push(issue({ file, line: idx + 1, rule: r.rule, severity: r.severity, title: `Possible ${r.name} in code`, description: `A value matching a ${r.name} pattern was found. Remove it from source, rotate the credential, and load it from a secret manager / environment variable.`, snippet: redactSecret(line, r.re).slice(0, 200) }));
      }
    }
    // Source-level vulnerability / quality rules.
    for (const r of CODE_RULES) {
      if (skipRules?.has(r.rule)) continue;
      if (r.langs && !r.langs.includes(lang)) continue;
      if (!r.re.test(line)) continue;
      const seen = perRule.get(r.rule) ?? 0;
      if (seen >= MAX_MATCHES_PER_RULE_PER_FILE) continue;
      perRule.set(r.rule, seen + 1);
      out.push(issue({ file, line: idx + 1, rule: r.rule, severity: r.severity, title: r.title, description: r.description, snippet: line.trim().slice(0, 200) }));
    }
  }
  return out.slice(0, MAX_ISSUES_PER_FILE);
}

export interface CodeAuditResult {
  findings: Finding[];
  issues: CodeIssue[];
  /** Maintainability hotspots (future-problem signals). */
  hotspots?: QualityHotspot[];
  qualitySummary?: QualitySummary;
}

/** A provider-agnostic view of a repo: list every blob path, read one file. Lets
 *  GitHub, GitLab, etc. share the exact same SAST / secret rule engine. */
export interface RepoFileSource {
  listTree(): Promise<string[]>;
  readFile(path: string): Promise<string | undefined>;
}

/**
 * Pick the files worth reading from a repo tree: committed env/Docker/config and
 * source files, skipping vendored/generated/build output, capped to the budget.
 * Pure — no I/O.
 */
export function selectFilesToRead(tree: string[]): string[] {
  const candidates = tree.filter((p) => !EXCLUDE_DIR.test(p) && !/\.min\.(js|css)$/.test(p));
  const envFiles = candidates.filter((p) => /(^|\/)\.env(\.|$)/.test(p) && !isExampleEnv(p));
  const dockerfiles = candidates.filter((p) => /(^|\/)Dockerfile(\.\w+)?$/i.test(p));
  const sourceFiles = candidates.filter((p) => SOURCE_EXT.has(p.split('.').pop()?.toLowerCase() ?? ''));
  const ranked = [
    ...envFiles,
    ...dockerfiles,
    ...sourceFiles.filter((p) => !/(^|\/|\.)(test|spec|__tests__|e2e)(s)?(\.|\/|$)/i.test(p)),
    ...sourceFiles.filter((p) => /(^|\/|\.)(test|spec|__tests__|e2e)(s)?(\.|\/|$)/i.test(p)),
  ];
  return [...new Set(ranked)].slice(0, MAX_FILE_READS);
}

/**
 * Run the secret-file, Dockerfile and per-line code/secret rules over a repo's
 * tree and already-fetched file contents. Pure — no I/O — so every provider can
 * fetch its own way and share this engine.
 */
export function analyzeContents(
  tree: string[],
  contents: Array<{ path: string; content: string | undefined }>,
): CodeAuditResult {
  const issues: CodeIssue[] = [];

  // 1) Committed secret-bearing files (presence alone is a finding).
  for (const path of tree) {
    if (isExampleEnv(path)) continue;
    const rule = SECRET_FILE_RULES.find((r) => r.re.test(path));
    if (rule) {
      issues.push(issue({ file: path, line: 1, rule: rule.rule, severity: rule.severity, title: `Committed ${rule.label}: ${path}`, description: `\`${path}\` is committed to source control. Remove it, rotate any exposed credentials, and add it to .gitignore.` }));
    }
  }

  // 2) Per-file Dockerfile + AST (JS/TS) + regex rules.
  for (const { path, content } of contents) {
    if (!content) continue;
    if (/(^|\/)Dockerfile(\.\w+)?$/i.test(path)) issues.push(...auditDockerfile(path, content));
    if (isJsLike(path)) {
      // AST-precise pass (confidence: high), with regex covering the rest
      // (skipping the rules the AST owns to avoid duplicate, weaker findings).
      issues.push(...analyzeJsAst(path, content));
      issues.push(...auditFileContent(path, content, AST_OWNED_RULES));
    } else {
      issues.push(...auditFileContent(path, content));
    }
  }

  // De-dup identical issues (same id), then default un-tagged issues (regex,
  // Docker, secret-file) to heuristic confidence — the AST pass already tags high.
  const seen = new Set<string>();
  const deduped = issues
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    .map((i) => (i.confidence ? i : { ...i, confidence: 'heuristic' as const }));
  const { hotspots, summary } = analyzeQuality(contents);
  return {
    issues: deduped,
    findings: deduped.map(findingFromIssue),
    hotspots,
    qualitySummary: summary,
  };
}

/** Audit any repo via a file source (provider-agnostic). When `fetchImpl` is
 *  given, detected secrets are live-verified and confirmed ones upgraded. */
export async function auditCodeSource(
  source: RepoFileSource,
  fetchImpl?: typeof fetch,
): Promise<CodeAuditResult> {
  let tree: string[];
  try {
    tree = await source.listTree();
  } catch (err) {
    logger.warn(`Code audit tree listing failed: ${(err as Error).message}`);
    return { findings: [], issues: [] };
  }
  if (tree.length === 0) return { findings: [], issues: [] };

  const toRead = selectFilesToRead(tree);
  const contents = await mapWithConcurrency(toRead, READ_CONCURRENCY, async (path) => ({
    path,
    content: await source.readFile(path),
  }));
  const result = analyzeContents(tree, contents);

  // Live-verify secrets; a confirmed key becomes a critical, verified finding.
  if (fetchImpl) {
    await verifySecrets(result.issues, contents, fetchImpl);
    result.findings = result.issues.map(findingFromIssue);
  }
  return result;
}

export async function auditRepoCode(repo: string, ctx: CollectorContext): Promise<CodeAuditResult> {
  if (!ctx.token) return { findings: [], issues: [] };
  return auditCodeSource(
    {
      listTree: () => listTree(repo, ctx),
      readFile: (path) => readFile(repo, path, ctx),
    },
    ctx.fetchImpl,
  );
}
