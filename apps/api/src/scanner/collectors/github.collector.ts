import { Injectable, Logger } from '@nestjs/common';
import type {
  RepoSignals,
  DependencyVulnerability,
  Finding,
  CodeIssue,
  ProviderId,
  QualityHotspot,
  AiComponentSignal,
} from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch, filterByEntitlements } from './collector';
import { auditRepoDependencies, ResolvedDep } from '../dependency-audit';
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

/** Dependency names from a pyproject.toml (PEP 621 + Poetry), lowercased. */
function parsePyprojectDeps(raw: string): string[] {
  const out: string[] = [];
  // PEP 621: dependencies = ["fastapi>=0.1", "redis", ...]
  const arr = raw.match(/dependencies\s*=\s*\[([\s\S]*?)\]/i);
  if (arr) {
    for (const m of arr[1].matchAll(/["']([A-Za-z0-9._-]+)/g)) {
      out.push(m[1].toLowerCase());
    }
  }
  // Poetry: [tool.poetry.dependencies] block of `name = "..."` lines.
  const poetry = raw.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\n\[|$)/i);
  if (poetry) {
    for (const line of poetry[1].split('\n')) {
      const m = line.match(/^\s*([A-Za-z0-9._-]+)\s*=/);
      if (m && m[1].toLowerCase() !== 'python') out.push(m[1].toLowerCase());
    }
  }
  return out;
}

/**
 * Infra services declared in a docker-compose file, mapped to tokens the shared
 * SERVICE_HINTS recognize. Lets us surface Redis/Postgres/RabbitMQ/… that exist
 * as compose services rather than app dependencies.
 */
function detectComposeServices(yaml: string): string[] {
  const text = yaml.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/postgres|postgis|pgvector|timescale/, 'postgres'],
    [/\bmysql\b|mariadb/, 'mysql'],
    [/\bmongo/, 'mongodb'],
    [/\bredis\b|valkey/, 'redis'],
    [/memcached/, 'memcached'],
    [/rabbitmq|amqp/, 'rabbitmq'],
    [/\bkafka\b/, 'kafkajs'],
    [/elasticsearch|opensearch/, 'elasticsearch'],
    [/\bminio\b/, 's3'],
    [/clickhouse/, 'clickhouse'],
  ];
  const out: string[] = [];
  for (const [re, token] of map) if (re.test(text)) out.push(token);
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
    let repos = selected.length > 0 ? selected : all;
    // Defense-in-depth: never scan more repos than the plan allows.
    const maxRepos = ctx.entitlements?.maxRepos;
    if (typeof maxRepos === 'number' && Number.isFinite(maxRepos)) {
      repos = repos.slice(0, maxRepos);
    }

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
    // Read the repo tree once so we can find manifests across a monorepo and
    // detect config/hosting files without one HTTP call per guess.
    const tree = await this.listTree(repo, ctx);
    const baseName = (p: string) => p.split('/').pop() ?? p;
    const hasFile = (name: string) => tree.some((p) => baseName(p) === name);

    // Manifests across the whole repo (root + workspaces), not just the root —
    // so monorepos where deps live in apps/* or packages/* are mapped too.
    const dependencies: string[] = [];
    const manifests = tree
      .filter((p) => !p.includes('node_modules/'))
      .filter((p) =>
        ['package.json', 'requirements.txt', 'go.mod', 'pyproject.toml'].includes(
          baseName(p),
        ),
      )
      .slice(0, 40);
    // Fall back to the root files if the tree couldn't be read.
    const manifestPaths = manifests.length
      ? manifests
      : ['package.json', 'requirements.txt', 'go.mod'];
    for (const path of manifestPaths) {
      const name = baseName(path);
      if (name === 'package.json') {
        const pkg = await this.readJson(repo, path, ctx);
        if (pkg) {
          dependencies.push(
            ...Object.keys({
              ...(pkg.dependencies ?? {}),
              ...(pkg.devDependencies ?? {}),
            }),
          );
        }
      } else if (name === 'requirements.txt') {
        const txt = await this.readText(repo, path, ctx);
        if (txt) dependencies.push(...parsePyDeps(txt));
      } else if (name === 'go.mod') {
        const txt = await this.readText(repo, path, ctx);
        if (txt) dependencies.push(...parseGoDeps(txt));
      } else if (name === 'pyproject.toml') {
        const txt = await this.readText(repo, path, ctx);
        if (txt) dependencies.push(...parsePyprojectDeps(txt));
      }
    }

    // Infra services declared in docker-compose surface as pseudo-deps so the
    // shared SERVICE_HINTS pick them up (redis, postgres, rabbitmq, …).
    const composePath = tree.find((p) =>
      /(^|\/)(docker-compose|compose)\.ya?ml$/.test(p),
    );
    if (composePath) {
      const compose = await this.readText(repo, composePath, ctx);
      if (compose) dependencies.push(...detectComposeServices(compose));
    }

    // Env-var names hint at integrations (Stripe, Redis, …) without reading
    // values. Read every committed example env file, root or nested.
    const envFiles = (
      tree.length
        ? tree.filter((p) => /(^|\/)\.env\.(example|sample|template)$/.test(p))
        : ['.env.example', '.env.sample']
    ).slice(0, 6);
    const envVars: string[] = [];
    for (const path of envFiles) {
      const txt = await this.readText(repo, path, ctx);
      if (txt) envVars.push(...parseEnvKeys(txt));
    }

    const frameworks = detectFrameworks(dependencies.map((d) => d.toLowerCase()));

    // Hosting platform from its config file — sets the frontend/api provider.
    let hostProvider: ProviderId | undefined;
    if (hasFile('vercel.json')) hostProvider = 'vercel';
    else if (hasFile('render.yaml') || hasFile('render.yml')) hostProvider = 'render';
    else if (hasFile('railway.json') || hasFile('railway.toml')) hostProvider = 'railway';

    const hasDockerfile =
      hasFile('Dockerfile') ||
      (tree.length === 0 && (await this.exists(repo, 'Dockerfile', ctx)));
    const hasKubernetes =
      tree.some((p) => /(^|\/)(k8s|kubernetes|helm|charts)\//.test(p)) ||
      (tree.length === 0 &&
        ((await this.exists(repo, 'k8s', ctx)) ||
          (await this.exists(repo, 'kubernetes', ctx))));

    // Deep analysis: lockfiles → OSV (SCA), and the file tree for committed
    // secrets / insecure config (SAST). Resilient — a failure never drops signals.
    let vulnerabilities: DependencyVulnerability[] | undefined;
    let components: ResolvedDep[] | undefined;
    let codeFindings: Finding[] | undefined;
    let codeIssues: CodeIssue[] | undefined;
    let qualityHotspots: QualityHotspot[] | undefined;
    let aiComponents: AiComponentSignal[] | undefined;
    if (ctx.token) {
      // Deep analysis is plan-gated: SCA and code/secret analysis unlock on
      // growth+. Undefined entitlements default to enabled (tests / public path).
      const scaEnabled = ctx.entitlements?.sca !== false;
      const codeEnabled = ctx.entitlements?.codeAudit !== false;
      const [sca, code] = await Promise.all([
        scaEnabled
          ? auditRepoDependencies(repo, ctx).catch((err) => {
              this.logger.warn(`Dependency audit of ${repo} failed: ${(err as Error).message}`);
              return undefined;
            })
          : Promise.resolve(undefined),
        codeEnabled
          ? auditRepoCode(repo, ctx).catch((err) => {
              this.logger.warn(`Code audit of ${repo} failed: ${(err as Error).message}`);
              return undefined;
            })
          : Promise.resolve(undefined),
      ]);
      vulnerabilities = sca?.vulnerabilities;
      components = sca?.components;
      // Secret + IaC findings are separately-gated tiers (pro+); drop them when
      // the plan only entitles SAST.
      codeFindings = filterByEntitlements(
        code?.findings.map((f) => ({ ...f, repo })),
        ctx.entitlements,
      );
      codeIssues = filterByEntitlements(
        code?.issues.map((i) => ({ ...i, repo })),
        ctx.entitlements,
      );
      qualityHotspots = code?.hotspots?.map((h) => ({ ...h, repo }));
      // Drop the evidence files — the graph only needs the component itself.
      aiComponents = code?.aiComponents?.map(({ files: _files, ...c }) => c);
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
      ...(codeIssues && codeIssues.length ? { codeIssues } : {}),
      ...(hostProvider ? { hostProvider } : {}),
      ...(vulnerabilities && vulnerabilities.length ? { vulnerabilities } : {}),
      ...(components && components.length ? { components } : {}),
      ...(codeFindings && codeFindings.length ? { codeFindings } : {}),
      ...(qualityHotspots && qualityHotspots.length ? { qualityHotspots } : {}),
      ...(aiComponents && aiComponents.length ? { aiComponents } : {}),
    };
  }

  /** All blob paths in the repo's default branch (best-effort). */
  private async listTree(repo: string, ctx: CollectorContext): Promise<string[]> {
    try {
      const res = await resilientFetch(
        ctx.fetchImpl,
        `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
        { headers: this.headers(ctx) },
      );
      if (!res.ok) return [];
      const body = (await res.json()) as {
        tree?: Array<{ path?: string; type?: string }>;
      };
      return (body.tree ?? [])
        .filter((t) => t.type === 'blob' && t.path)
        .map((t) => t.path as string);
    } catch {
      return [];
    }
  }

  private async readText(
    repo: string,
    path: string,
    ctx: CollectorContext,
  ): Promise<string | undefined> {
    const res = await resilientFetch(
      ctx.fetchImpl,
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
    const res = await resilientFetch(
      ctx.fetchImpl,
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
    const res = await resilientFetch(
      ctx.fetchImpl,
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
