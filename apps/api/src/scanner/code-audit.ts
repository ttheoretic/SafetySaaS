import { Logger } from '@nestjs/common';
import type { Finding, Severity } from '@riscly/shared';
import { resilientFetch, CollectorContext } from './collectors/collector';

/**
 * Code-level security analysis (lightweight SAST): inspects a repo's file tree
 * for committed secrets and insecure configuration. Complements the dependency
 * audit (SCA) — together they turn "what's in the code" into concrete risks.
 *
 * Bounded by design: one tree listing + a small, curated set of file reads, so
 * a scan never fans out across an entire codebase.
 */
const MAX_FILE_READS = 14;
const MAX_FILE_BYTES = 200_000;

const logger = new Logger('CodeAudit');

interface SecretRule {
  name: string;
  re: RegExp;
  severity: Severity;
}

// Classic, low-false-positive secret signatures.
const SECRET_RULES: SecretRule[] = [
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
  { name: 'Stripe live secret key', re: /sk_live_[0-9a-zA-Z]{20,}/, severity: 'critical' },
  { name: 'GitHub personal access token', re: /\b(ghp|gho|ghs)_[0-9A-Za-z]{36}\b/, severity: 'critical' },
  { name: 'GitHub fine-grained token', re: /github_pat_[0-9A-Za-z_]{40,}/, severity: 'critical' },
  { name: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/, severity: 'high' },
  { name: 'Slack token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/, severity: 'high' },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, severity: 'critical' },
  { name: 'Stripe test secret key', re: /sk_test_[0-9a-zA-Z]{20,}/, severity: 'medium' },
];

// Committed files that should essentially never be in source control.
const SECRET_FILE_RULES: Array<{ re: RegExp; label: string; severity: Severity }> = [
  { re: /(^|\/)\.env(\.(local|production|prod|development|dev|staging))?$/, label: 'environment file with secrets', severity: 'high' },
  { re: /(^|\/)id_rsa$/, label: 'SSH private key', severity: 'critical' },
  { re: /\.(pem|pfx|p12)$/, label: 'private key / certificate', severity: 'high' },
  { re: /(^|\/)credentials\.json$/, label: 'credentials file', severity: 'high' },
  { re: /serviceaccount.*\.json$/i, label: 'service-account key', severity: 'critical' },
  { re: /(^|\/)\.pgpass$/, label: 'database password file', severity: 'high' },
];

const sec = (severity: Severity, title: string, description: string): Finding => ({
  category: 'security',
  severity,
  title,
  description,
  weight: severity === 'critical' ? 22 : severity === 'high' ? 14 : severity === 'medium' ? 8 : 3,
});

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

/** Scan a Dockerfile's contents for common insecure-configuration patterns. */
function auditDockerfile(content: string): Finding[] {
  const out: Finding[] = [];
  const lines = content.split('\n').map((l) => l.trim());
  const from = lines.find((l) => /^FROM\s+/i.test(l));
  if (from && (/:latest\b/i.test(from) || !/:/.test(from.replace(/\s+AS\s+\w+/i, '')))) {
    out.push(sec('low', 'Dockerfile uses an unpinned base image',
      'The base image is `:latest` or untagged, so builds are non-reproducible and may pull in unexpected/vulnerable images. Pin a specific version/digest.'));
  }
  const hasUser = lines.some((l) => /^USER\s+(?!root\b)\S+/i.test(l));
  if (!hasUser) {
    out.push(sec('medium', 'Container runs as root',
      'No non-root `USER` is set in the Dockerfile, so the container runs as root — a privilege-escalation risk if the app is compromised. Add a dedicated `USER`.'));
  }
  const secretEnv = lines.find((l) => /^(ENV|ARG)\s+.*(SECRET|PASSWORD|TOKEN|API_?KEY|PRIVATE_?KEY)\s*=\s*\S+/i.test(l));
  if (secretEnv) {
    out.push(sec('high', 'Secret baked into the Docker image',
      'A secret-looking value is set via `ENV`/`ARG` in the Dockerfile; it gets embedded in image layers. Inject secrets at runtime instead.'));
  }
  return out;
}

export async function auditRepoCode(repo: string, ctx: CollectorContext): Promise<Finding[]> {
  if (!ctx.token) return [];
  let tree: string[];
  try {
    tree = await listTree(repo, ctx);
  } catch (err) {
    logger.warn(`Code audit tree listing for ${repo} failed: ${(err as Error).message}`);
    return [];
  }
  if (tree.length === 0) return [];

  const findings: Finding[] = [];

  // 1) Committed secret-bearing files (presence alone is a finding).
  for (const path of tree) {
    if (isExampleEnv(path)) continue;
    const rule = SECRET_FILE_RULES.find((r) => r.re.test(path));
    if (rule) {
      findings.push(sec(rule.severity, `Committed ${rule.label}: ${path}`,
        `\`${path}\` is committed to source control. Remove it, rotate any exposed credentials, and add it to .gitignore.`));
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
    if (/(^|\/)Dockerfile$/i.test(path)) findings.push(...auditDockerfile(content));
    for (const rule of SECRET_RULES) {
      if (rule.re.test(content)) {
        findings.push(sec(rule.severity, `Possible ${rule.name} in ${path}`,
          `A value matching a ${rule.name} pattern was found in \`${path}\`. Rotate the credential immediately and move it to a secret manager / environment variable.`));
      }
    }
  }

  // De-dup identical findings (same title).
  const seen = new Set<string>();
  return findings.filter((f) => (seen.has(f.title) ? false : (seen.add(f.title), true)));
}
