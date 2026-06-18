import { Injectable, Logger } from '@nestjs/common';
import type { RepoSignals, DependencyVulnerability, Finding } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext } from './collector';
import { auditRepoDependencies } from '../dependency-audit';
import { auditRepoCode } from '../code-audit';

/** Framework detection across ecosystems (npm exact names + Python/Go modules). */
const FRAMEWORK_HINTS: Array<{ match: RegExp; id: string }> = [
  { match: /(^|\/)next$/, id: 'nextjs' },
  { match: /@nestjs\/core|(^|\/)nest$/, id: 'nestjs' },
  { match: /(^|\/)express$/, id: 'express' },
  { match: /(^|\/)fastify$/, id: 'fastify' },
  { match: /(^|\/)koa$/, id: 'koa' },
  { match: /(^|\/)react$/, id: 'react' },
  { match: /(^|\/)vue$/, id: 'vue' },
  { match: /(^|\/)nuxt$/, id: 'nuxt' },
  { match: /@angular\/core/, id: 'angular' },
  { match: /(^|\/)svelte(kit)?$/, id: 'svelte' },
  { match: /(^|\/)django$/, id: 'django' },
  { match: /(^|\/)flask$/, id: 'flask' },
  { match: /(^|\/)fastapi$/, id: 'fastapi' },
  { match: /gin-gonic\/gin/, id: 'gin' },
  { match: /labstack\/echo/, id: 'echo' },
  { match: /gofiber\/fiber/, id: 'fiber' },
  { match: /(^|\/)rails$|railties/, id: 'rails' },
  { match: /(^|\/)laravel\//, id: 'laravel' },
  { match: /spring-boot|springframework/, id: 'spring' },
];

function detectFrameworks(deps: string[]): string[] {
  const found = new Set<string>();
  for (const dep of deps) {
    for (const h of FRAMEWORK_HINTS) if (h.match.test(dep)) found.add(h.id);
  }
  return [...found];
}

/** Package names from a requirements.txt (name only, lowercased). */
function parsePyDeps(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#') || s.startsWith('-')) continue;
    const m = s.match(/^([A-Za-z0-9._-]+)/);
    if (m) out.push(m[1].toLowerCase());
  }
  return out;
}

/** Module paths required in a go.mod (lowercased). */
function parseGoDeps(raw: string): string[] {
  const out: string[] = [];
  const re = /^\s*([\w.\-]+(?:\/[\w.\-]+)+)\s+v[0-9]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.push(m[1].toLowerCase());
  return out;
}

/** Variable names declared in a .env.example (values never read). */
function parseEnvKeys(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const m = s.match(/^(?:export\s+)?([A-Za-z0-9_]+)\s*=/);
    if (m) out.push(m[1]);
  }
  return out;
}

/**
 * Collects repository signals from GitHub. Reads each repo's package.json via
 * the contents API and reduces it to RepoSignals. Falls back to any signals
 * pre-provided in the connection metadata (useful when no token / offline).
 */
@Injectable()
export class GithubCollector implements ProviderCollector {
  readonly provider = 'github';
  private readonly logger = new Logger(GithubCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext) {
    const meta = connection.metadata ?? {};
    const all: string[] = Array.isArray(meta.repos) ? (meta.repos as string[]) : [];
    // Honor an explicit repo selection; fall back to all discovered repos so
    // pre-selection connections keep working.
    const selected: string[] = Array.isArray(meta.selectedRepos)
      ? (meta.selectedRepos as string[])
      : [];
    const repos = selected.length > 0 ? selected : all;

    // Offline / no-token fallback: explicit signals provided in metadata.
    const provided = (meta.signals as RepoSignals[] | undefined) ?? undefined;
    if (!ctx.token && provided) return { repos: provided };

    const results: RepoSignals[] = [];
    for (const repo of repos) {
      try {
        const signals = await this.scanRepo(repo, ctx);
        if (signals) results.push(signals);
      } catch (err) {
        this.logger.warn(`GitHub scan of ${repo} failed: ${(err as Error).message}`);
      }
    }
    // Merge in any provided signals as well.
    return { repos: [...results, ...(provided ?? [])] };
  }

  private async scanRepo(
    repo: string,
    ctx: CollectorContext,
  ): Promise<RepoSignals | undefined> {
    // Detect modules/tools across ecosystems — not just package.json — so
    // Python/Go/Ruby services are mapped too.
    const dependencies: string[] = [];
    const pkg = await this.readJson(repo, 'package.json', ctx);
    if (pkg) {
      dependencies.push(...Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }));
    }
    const requirements = await this.readText(repo, 'requirements.txt', ctx);
    if (requirements) dependencies.push(...parsePyDeps(requirements));
    const goMod = await this.readText(repo, 'go.mod', ctx);
    if (goMod) dependencies.push(...parseGoDeps(goMod));

    // Env-var names hint at integrations (and auth/db) without reading values.
    const envExample =
      (await this.readText(repo, '.env.example', ctx)) ??
      (await this.readText(repo, '.env.sample', ctx));
    const envVars = envExample ? parseEnvKeys(envExample) : [];

    const frameworks = detectFrameworks(dependencies.map((d) => d.toLowerCase()));

    const hasDockerfile = await this.exists(repo, 'Dockerfile', ctx);
    const hasKubernetes =
      (await this.exists(repo, 'k8s', ctx)) ||
      (await this.exists(repo, 'kubernetes', ctx));

    // Deep analysis: lockfiles → OSV (SCA), and the file tree for committed
    // secrets / insecure config (SAST). Resilient — a failure never drops signals.
    let vulnerabilities: DependencyVulnerability[] | undefined;
    let codeFindings: Finding[] | undefined;
    if (ctx.token) {
      const [vulns, code] = await Promise.all([
        auditRepoDependencies(repo, ctx).catch((err) => {
          this.logger.warn(`Dependency audit of ${repo} failed: ${(err as Error).message}`);
          return undefined;
        }),
        auditRepoCode(repo, ctx).catch((err) => {
          this.logger.warn(`Code audit of ${repo} failed: ${(err as Error).message}`);
          return undefined;
        }),
      ]);
      vulnerabilities = vulns;
      codeFindings = code;
    }

    // Skip a repo only when there's genuinely nothing to say about it.
    const hasAnything =
      dependencies.length > 0 || envVars.length > 0 || hasDockerfile ||
      (vulnerabilities?.length ?? 0) > 0 || (codeFindings?.length ?? 0) > 0;
    if (!hasAnything) return undefined;

    return {
      provider: 'github',
      repo,
      dependencies,
      frameworks,
      ...(envVars.length ? { envVars } : {}),
      hasDockerfile,
      hasKubernetes,
      ...(vulnerabilities && vulnerabilities.length ? { vulnerabilities } : {}),
      ...(codeFindings && codeFindings.length ? { codeFindings } : {}),
    };
  }

  private async readText(
    repo: string,
    path: string,
    ctx: CollectorContext,
  ): Promise<string | undefined> {
    const res = await ctx.fetchImpl(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      { headers: this.headers(ctx) },
    );
    if (!res.ok) return undefined;
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (!body.content) return undefined;
    return Buffer.from(body.content, (body.encoding as BufferEncoding) ?? 'base64').toString('utf8');
  }

  private async readJson(
    repo: string,
    path: string,
    ctx: CollectorContext,
  ): Promise<any | undefined> {
    const res = await ctx.fetchImpl(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      { headers: this.headers(ctx) },
    );
    if (!res.ok) return undefined;
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (!body.content) return undefined;
    const decoded = Buffer.from(
      body.content,
      (body.encoding as BufferEncoding) ?? 'base64',
    ).toString('utf8');
    try {
      return JSON.parse(decoded);
    } catch {
      return undefined;
    }
  }

  private async exists(repo: string, path: string, ctx: CollectorContext) {
    const res = await ctx.fetchImpl(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      { headers: this.headers(ctx), method: 'HEAD' },
    );
    return res.ok;
  }

  private headers(ctx: CollectorContext): Record<string, string> {
    const h: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'user-agent': 'riscly-scanner',
    };
    if (ctx.token) h.authorization = `Bearer ${ctx.token}`;
    return h;
  }
}
