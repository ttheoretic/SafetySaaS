import { Injectable, Logger } from '@nestjs/common';
import type { RepoSignals } from '@failsafe/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext } from './collector';

const FRAMEWORK_DEP_MAP: Record<string, string> = {
  next: 'nextjs',
  '@nestjs/core': 'nestjs',
  express: 'express',
  fastify: 'fastify',
  koa: 'koa',
  react: 'react',
  vue: 'vue',
  nuxt: 'nuxt',
  '@angular/core': 'angular',
  svelte: 'svelte',
};

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
    const repos: string[] = Array.isArray(meta.repos) ? (meta.repos as string[]) : [];

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
    const pkg = await this.readJson(repo, 'package.json', ctx);
    if (!pkg) return undefined;

    const deps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    } as Record<string, string>;
    const dependencies = Object.keys(deps);
    const frameworks = [
      ...new Set(
        dependencies
          .map((d) => FRAMEWORK_DEP_MAP[d])
          .filter((f): f is string => Boolean(f)),
      ),
    ];

    const hasDockerfile = await this.exists(repo, 'Dockerfile', ctx);
    const hasKubernetes =
      (await this.exists(repo, 'k8s', ctx)) ||
      (await this.exists(repo, 'kubernetes', ctx));

    return {
      provider: 'github',
      repo,
      dependencies,
      frameworks,
      hasDockerfile,
      hasKubernetes,
    };
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
      'user-agent': 'failsafe-ai-scanner',
    };
    if (ctx.token) h.authorization = `Bearer ${ctx.token}`;
    return h;
  }
}
