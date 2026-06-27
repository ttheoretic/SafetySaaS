import { Logger } from '@nestjs/common';
import type { DependencyVulnerability, Severity } from '@riscly/shared';
import { resilientFetch, CollectorContext } from './collectors/collector';

/**
 * Software-composition analysis (SCA): resolve a repo's dependency tree from
 * its lockfiles/manifests and query OSV.dev for known vulnerabilities. This is
 * the "deep code analysis" layer — concrete CVEs/advisories in the actual
 * versions the repo ships, not inferred from topology.
 *
 * OSV.dev is a free, public, no-key vulnerability database (npm, PyPI, Go, …).
 */
const OSV = 'https://api.osv.dev';
const MAX_PACKAGES = 250; // bound work on huge lockfiles
const MAX_DETAIL_LOOKUPS = 60; // bound advisory-detail requests

const logger = new Logger('DependencyAudit');

export interface ResolvedDep {
  name: string;
  version: string;
  ecosystem: string;
}

/** Read a raw text file from a GitHub repo via the contents API. */
async function readFile(repo: string, path: string, ctx: CollectorContext): Promise<string | undefined> {
  try {
    const res = await resilientFetch(
      ctx.fetchImpl,
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'riscly-scanner',
          ...(ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}),
        },
      },
    );
    if (!res.ok) return undefined;
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (!body.content) return undefined;
    return Buffer.from(body.content, (body.encoding as BufferEncoding) ?? 'base64').toString('utf8');
  } catch {
    return undefined;
  }
}

/** Extract resolved npm deps from a package-lock.json (v2/v3 `packages`, or v1 `dependencies`). */
export function parseNpmLock(raw: string): ResolvedDep[] {
  let json: any;
  try { json = JSON.parse(raw); } catch { return []; }
  const out: ResolvedDep[] = [];
  const seen = new Set<string>();
  const add = (name: string, version?: string) => {
    if (!name || !version) return;
    const key = `${name}@${version}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name, version, ecosystem: 'npm' });
  };
  // npm v2/v3
  if (json.packages && typeof json.packages === 'object') {
    for (const [path, info] of Object.entries<any>(json.packages)) {
      if (!path) continue; // "" is the root project
      const name = path.split('node_modules/').pop();
      if (name) add(name, info?.version);
    }
  }
  // npm v1 (shallow)
  if (json.dependencies && typeof json.dependencies === 'object') {
    for (const [name, info] of Object.entries<any>(json.dependencies)) add(name, info?.version);
  }
  return out;
}

/** Extract resolved Go modules from a go.sum (deduped; ignores the /go.mod hashes). */
export function parseGoSum(raw: string): ResolvedDep[] {
  const out: ResolvedDep[] = [];
  const seen = new Set<string>();
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\S+)\s+(v\S+?)(?:\/go\.mod)?\s+h1:/);
    if (!m) continue;
    const [, name, version] = m;
    const key = `${name}@${version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, version, ecosystem: 'Go' });
  }
  return out;
}

/** Extract resolved PyPI deps from a poetry.lock ([[package]] blocks). */
export function parsePoetryLock(raw: string): ResolvedDep[] {
  const out: ResolvedDep[] = [];
  for (const block of raw.split(/\[\[package\]\]/).slice(1)) {
    const name = block.match(/\bname\s*=\s*"([^"]+)"/);
    const version = block.match(/\bversion\s*=\s*"([^"]+)"/);
    if (name && version) out.push({ name: name[1], version: version[1], ecosystem: 'PyPI' });
  }
  return out;
}

/** Extract pinned PyPI deps (`name==1.2.3`) from a requirements.txt. */
export function parseRequirements(raw: string): ResolvedDep[] {
  const out: ResolvedDep[] = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#') || s.startsWith('-')) continue;
    const m = s.match(/^([A-Za-z0-9._-]+)\s*==\s*([A-Za-z0-9._-]+)/);
    if (m) out.push({ name: m[1], version: m[2], ecosystem: 'PyPI' });
  }
  return out;
}

/** The npm name encoded in a yarn/pnpm spec, e.g. "@scope/x@npm:^1" → "@scope/x". */
function npmSpecName(spec: string): string | undefined {
  const s = spec.trim().replace(/^"|"$/g, '');
  if (!s) return undefined;
  const at = s.lastIndexOf('@');
  return at <= 0 ? s : s.slice(0, at); // at===0 means a bare scope, keep as-is
}

/** Extract resolved deps from a yarn.lock (classic v1 and berry). */
export function parseYarnLock(raw: string): ResolvedDep[] {
  const out: ResolvedDep[] = [];
  const seen = new Set<string>();
  let names: string[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line) && line.trimEnd().endsWith(':')) {
      names = line
        .trimEnd()
        .replace(/:$/, '')
        .split(',')
        .map((p) => npmSpecName(p))
        .filter((n): n is string => Boolean(n));
      continue;
    }
    const m = line.match(/^\s+version:?\s+"?([^"\s]+)"?/);
    if (m && names.length) {
      for (const name of names) {
        const key = `${name}@${m[1]}`;
        if (!seen.has(key)) { seen.add(key); out.push({ name, version: m[1], ecosystem: 'npm' }); }
      }
      names = [];
    }
  }
  return out;
}

/** Extract resolved deps from a pnpm-lock.yaml (best-effort across versions). */
export function parsePnpmLock(raw: string): ResolvedDep[] {
  const out: ResolvedDep[] = [];
  const seen = new Set<string>();
  // Package keys look like /lodash@4.17.20:, /lodash/4.17.20:, /@scope/n@1.2.3:
  const re = /^\s+'?\/?(@?[\w.-]+(?:\/[\w.-]+)?)[@/](\d[\w.\-+]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1];
    const version = m[2].split('(')[0];
    const key = `${name}@${version}`;
    if (!seen.has(key)) { seen.add(key); out.push({ name, version, ecosystem: 'npm' }); }
  }
  return out;
}

function mapSeverity(vuln: any): Severity {
  const s = String(vuln?.database_specific?.severity ?? '').toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MODERATE' || s === 'MEDIUM') return 'medium';
  if (s === 'LOW') return 'low';
  return 'medium'; // unknown → treat as medium so it isn't silently ignored
}

function firstFixedVersion(vuln: any, pkg: string): string | undefined {
  for (const affected of vuln?.affected ?? []) {
    if (affected?.package?.name && affected.package.name !== pkg) continue;
    for (const range of affected?.ranges ?? []) {
      for (const event of range?.events ?? []) {
        if (event?.fixed) return String(event.fixed);
      }
    }
  }
  return undefined;
}

/** OSV batch query — returns, per input dep, the advisory ids affecting it. */
async function osvQueryBatch(
  deps: ResolvedDep[],
  fetchImpl: typeof fetch,
): Promise<Array<{ dep: ResolvedDep; ids: string[] }>> {
  const queries = deps.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version }));
  const res = await resilientFetch(fetchImpl, `${OSV}/v1/querybatch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries }),
  });
  if (!res.ok) throw new Error(`OSV querybatch failed: ${res.status}`);
  const body = (await res.json()) as { results?: Array<{ vulns?: Array<{ id: string }> }> };
  const results = body.results ?? [];
  return deps
    .map((dep, i) => ({ dep, ids: (results[i]?.vulns ?? []).map((v) => v.id) }))
    .filter((r) => r.ids.length > 0);
}

/** Fetch advisory detail (severity, summary, fix) for a single OSV id. */
async function osvVulnDetail(id: string, fetchImpl: typeof fetch): Promise<any | undefined> {
  try {
    const res = await resilientFetch(fetchImpl, `${OSV}/v1/vulns/${id}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}

/** Run OSV over a resolved dependency list and return per-version vulnerabilities. */
export async function auditResolvedDeps(
  deps: ResolvedDep[],
  repo: string,
  fetchImpl: typeof fetch,
): Promise<DependencyVulnerability[]> {
  if (deps.length === 0) return [];
  const bounded = deps.slice(0, MAX_PACKAGES);
  const hits = await osvQueryBatch(bounded, fetchImpl);
  if (hits.length === 0) return [];

  // Fetch each advisory's detail once (deduped, bounded).
  const uniqueIds = [...new Set(hits.flatMap((h) => h.ids))].slice(0, MAX_DETAIL_LOOKUPS);
  const details = new Map<string, any>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      const d = await osvVulnDetail(id, fetchImpl);
      if (d) details.set(id, d);
    }),
  );

  const out: DependencyVulnerability[] = [];
  for (const { dep, ids } of hits) {
    for (const id of ids) {
      const detail = details.get(id);
      out.push({
        id,
        package: dep.name,
        version: dep.version,
        ecosystem: dep.ecosystem,
        severity: detail ? mapSeverity(detail) : 'medium',
        summary: detail?.summary ?? detail?.details?.slice(0, 140) ?? 'Known vulnerability',
        fixedVersion: detail ? firstFixedVersion(detail, dep.name) : undefined,
        repo,
        references: (detail?.references ?? []).map((r: any) => r?.url).filter(Boolean).slice(0, 3),
      });
    }
  }
  // Most severe first.
  const order: Severity[] = ['low', 'medium', 'high', 'critical'];
  return out.sort((a, b) => order.indexOf(b.severity) - order.indexOf(a.severity));
}

export interface DependencyAuditResult {
  vulnerabilities: DependencyVulnerability[];
  /** The full resolved component set (for the SBOM), not just vulnerable ones. */
  components: ResolvedDep[];
}

/** Resolve a repo's lockfiles/manifests and audit them against OSV. Returns the
 *  full resolved component list (SBOM) plus the known vulnerabilities. */
export async function auditRepoDependencies(
  repo: string,
  ctx: CollectorContext,
): Promise<DependencyAuditResult> {
  const deps: ResolvedDep[] = [];

  const lockfiles: Array<[string, (raw: string) => ResolvedDep[]]> = [
    ['package-lock.json', parseNpmLock],
    ['yarn.lock', parseYarnLock],
    ['pnpm-lock.yaml', parsePnpmLock],
    ['requirements.txt', parseRequirements],
    ['poetry.lock', parsePoetryLock],
    ['go.sum', parseGoSum],
  ];
  for (const [path, parse] of lockfiles) {
    const raw = await readFile(repo, path, ctx);
    if (raw) deps.push(...parse(raw));
  }

  // De-dup across lockfiles (a repo may ship more than one).
  const seen = new Set<string>();
  const unique = deps.filter((d) => {
    const k = `${d.ecosystem}:${d.name}@${d.version}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (unique.length === 0) return { vulnerabilities: [], components: [] };
  try {
    const vulnerabilities = await auditResolvedDeps(unique, repo, ctx.fetchImpl);
    return { vulnerabilities, components: unique };
  } catch (err) {
    logger.warn(`Dependency audit for ${repo} failed: ${(err as Error).message}`);
    return { vulnerabilities: [], components: unique };
  }
}
