import { Logger } from '@nestjs/common';
import type { CodeIssue, Finding, Severity } from '@riscly/shared';
import { resilientFetch, CollectorContext } from './collectors/collector';

/**
 * Code-level security analysis (lightweight SAST): inspects a repo's file tree
 * for committed secrets and insecure configuration. Complements the dependency
 * audit (SCA) — together they turn "what's in the code" into concrete risks.
 *
 * Produces line-located CodeIssues (file + line + rule + snippet) so the code
 * view can show only the affected regions and an AI can propose a fix; the
 * topology Findings are derived from those issues.
 *
 * Bounded by design: one tree listing + a small, curated set of file reads, so
 * a scan never fans out across an entire codebase.
 */
const MAX_FILE_READS = 14;
const MAX_FILE_BYTES = 200_000;

const logger = new Logger('CodeAudit');

interface SecretRule {
  rule: string;
  name: string;
  re: RegExp;
  severity: Severity;
}

// Classic, low-false-positive secret signatures.
const SECRET_RULES: SecretRule[] = [
  { rule: 'secret/aws-access-key', name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
  { rule: 'secret/stripe-live-key', name: 'Stripe live secret key', re: /sk_live_[0-9a-zA-Z]{20,}/, severity: 'critical' },
  { rule: 'secret/github-pat', name: 'GitHub personal access token', re: /\b(ghp|gho|ghs)_[0-9A-Za-z]{36}\b/, severity: 'critical' },
  { rule: 'secret/github-fine-grained', name: 'GitHub fine-grained token', re: /github_pat_[0-9A-Za-z_]{40,}/, severity: 'critical' },
  { rule: 'secret/google-api-key', name: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/, severity: 'high' },
  { rule: 'secret/slack-token', name: 'Slack token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/, severity: 'high' },
  { rule: 'secret/private-key', name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, severity: 'critical' },
  { rule: 'secret/stripe-test-key', name: 'Stripe test secret key', re: /sk_test_[0-9a-zA-Z]{20,}/, severity: 'medium' },
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
  file: string;
  line: number;
  endLine?: number;
  rule: string;
  severity: Severity;
  title: string;
  description: string;
  snippet?: string;
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
  };
}

/** First 1-based line matching a pattern, plus the trimmed line as a snippet. */
function locate(lines: string[], re: RegExp): { line: number; snippet?: string } {
  const idx = lines.findIndex((l) => re.test(l));
  if (idx < 0) return { line: 1 };
  return { line: idx + 1, snippet: lines[idx].trim().slice(0, 200) };
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
  const res = await ghGet(repo, `contents/${path}`, ctx);
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
    out.push(issue({
      file, line: fromIdx + 1, rule: 'docker/unpinned-base-image', severity: 'low',
      title: 'Dockerfile uses an unpinned base image',
      description:
        'The base image is `:latest` or untagged, so builds are non-reproducible and may pull in unexpected/vulnerable images. Pin a specific version/digest.',
      snippet: from.trim().slice(0, 200),
    }));
  }
  const hasUser = lines.some((l) => /^\s*USER\s+(?!root\b)\S+/i.test(l));
  if (!hasUser) {
    out.push(issue({
      file, line: fromIdx >= 0 ? fromIdx + 1 : 1, rule: 'docker/root-user', severity: 'medium',
      title: 'Container runs as root',
      description:
        'No non-root `USER` is set in the Dockerfile, so the container runs as root — a privilege-escalation risk if the app is compromised. Add a dedicated `USER`.',
    }));
  }
  const secretIdx = lines.findIndex((l) =>
    /^\s*(ENV|ARG)\s+.*(SECRET|PASSWORD|TOKEN|API_?KEY|PRIVATE_?KEY)\s*=\s*\S+/i.test(l),
  );
  if (secretIdx >= 0) {
    out.push(issue({
      file, line: secretIdx + 1, rule: 'docker/baked-secret', severity: 'high',
      title: 'Secret baked into the Docker image',
      description:
        'A secret-looking value is set via `ENV`/`ARG` in the Dockerfile; it gets embedded in image layers. Inject secrets at runtime instead.',
      snippet: lines[secretIdx].trim().slice(0, 200),
    }));
  }
  return out;
}

export interface CodeAuditResult {
  findings: Finding[];
  issues: CodeIssue[];
}

export async function auditRepoCode(repo: string, ctx: CollectorContext): Promise<CodeAuditResult> {
  if (!ctx.token) return { findings: [], issues: [] };
  let tree: string[];
  try {
    tree = await listTree(repo, ctx);
  } catch (err) {
    logger.warn(`Code audit tree listing for ${repo} failed: ${(err as Error).message}`);
    return { findings: [], issues: [] };
  }
  if (tree.length === 0) return { findings: [], issues: [] };

  const issues: CodeIssue[] = [];

  // 1) Committed secret-bearing files (presence alone is a finding).
  for (const path of tree) {
    if (isExampleEnv(path)) continue;
    const rule = SECRET_FILE_RULES.find((r) => r.re.test(path));
    if (rule) {
      issues.push(issue({
        file: path, line: 1, rule: rule.rule, severity: rule.severity,
        title: `Committed ${rule.label}: ${path}`,
        description: `\`${path}\` is committed to source control. Remove it, rotate any exposed credentials, and add it to .gitignore.`,
      }));
    }
  }

  // 2) Read a bounded set of high-signal files and scan their contents.
  const envFiles = tree.filter((p) => /(^|\/)\.env(\.|$)/.test(p) && !isExampleEnv(p));
  const dockerfiles = tree.filter((p) => /(^|\/)Dockerfile$/i.test(p));
  const configFiles = tree.filter((p) => /(^|\/)(config|settings|secrets)\.(js|ts|json|py|yml|yaml)$/i.test(p));
  const toRead = [...envFiles, ...dockerfiles, ...configFiles].slice(0, MAX_FILE_READS);

  for (const path of toRead) {
    const content = await readFile(repo, path, ctx);
    if (!content) continue;
    if (/(^|\/)Dockerfile$/i.test(path)) issues.push(...auditDockerfile(path, content));
    const lines = content.split('\n');
    for (const rule of SECRET_RULES) {
      if (rule.re.test(content)) {
        const at = locate(lines, rule.re);
        issues.push(issue({
          file: path, line: at.line, rule: rule.rule, severity: rule.severity,
          title: `Possible ${rule.name} in ${path}`,
          description: `A value matching a ${rule.name} pattern was found in \`${path}\`. Rotate the credential immediately and move it to a secret manager / environment variable.`,
          snippet: at.snippet,
        }));
      }
    }
  }

  // De-dup identical issues (same id).
  const seen = new Set<string>();
  const deduped = issues.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  return { issues: deduped, findings: deduped.map(findingFromIssue) };
}
