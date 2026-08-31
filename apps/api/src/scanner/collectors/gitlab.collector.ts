import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, RepoSignals } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch, filterByEntitlements } from './collector';
import { auditCodeSource, RepoFileSource } from '../code-audit';

interface GitlabTreeEntry {
  path?: string;
  type?: string; // 'blob' | 'tree'
}

const TREE_PAGES = 4;
const PER_PAGE = 100;

/**
 * GitLab collector. Mirrors the GitHub collector's code analysis for GitLab
 * repositories: it lists each selected project's tree and reads its source over
 * the GitLab REST API, then runs the exact same provider-agnostic SAST / secret
 * engine (auditCodeSource). Supports gitlab.com and self-hosted (metadata.baseUrl).
 */
@Injectable()
export class GitlabCollector implements ProviderCollector {
  readonly provider = 'gitlab';
  private readonly logger = new Logger(GitlabCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    if (!ctx.token) return {};

    const base = (typeof meta.baseUrl === 'string' ? meta.baseUrl : 'https://gitlab.com').replace(/\/$/, '');
    const all: string[] = Array.isArray(meta.repos) ? (meta.repos as string[]) : [];
    const selected: string[] = Array.isArray(meta.selectedRepos) ? (meta.selectedRepos as string[]) : [];
    let repos = selected.length > 0 ? selected : all;
    const maxRepos = ctx.entitlements?.maxRepos;
    if (typeof maxRepos === 'number' && Number.isFinite(maxRepos)) repos = repos.slice(0, maxRepos);

    const out: RepoSignals[] = [];
    for (const repo of repos) {
      try {
        const signals = await this.scanRepo(base, repo, ctx);
        if (signals) out.push(signals);
      } catch (err) {
        this.logger.warn(`GitLab scan of ${repo} failed: ${(err as Error).message}`);
      }
    }
    return { repos: out };
  }

  private async scanRepo(
    base: string,
    repo: string,
    ctx: CollectorContext,
  ): Promise<RepoSignals | undefined> {
    const pid = encodeURIComponent(repo);
    const branch = await this.defaultBranch(base, pid, ctx);
    const source: RepoFileSource = {
      listTree: () => this.listTree(base, pid, ctx),
      readFile: (path) => this.readFile(base, pid, path, branch, ctx),
    };

    // SAST (code audit) is plan-gated; secret + IaC findings are gated further.
    const code =
      ctx.entitlements?.codeAudit === false
        ? undefined
        : await auditCodeSource(source, ctx.fetchImpl).catch((err) => {
            this.logger.warn(`GitLab code audit of ${repo} failed: ${(err as Error).message}`);
            return undefined;
          });

    const codeFindings =
      filterByEntitlements(
        (code?.findings ?? []).map((f) => ({ ...f, repo })),
        ctx.entitlements,
      ) ?? [];
    const codeIssues =
      filterByEntitlements(
        (code?.issues ?? []).map((i) => ({ ...i, repo })),
        ctx.entitlements,
      ) ?? [];
    if (codeFindings.length === 0 && codeIssues.length === 0) return undefined;

    const qualityHotspots = code?.hotspots?.map((h) => ({ ...h, repo }));
    const aiComponents = code?.aiComponents?.map(({ files: _files, ...c }) => c);

    return {
      provider: 'gitlab',
      repo,
      dependencies: [],
      ...(codeIssues.length ? { codeIssues } : {}),
      ...(codeFindings.length ? { codeFindings } : {}),
      ...(qualityHotspots && qualityHotspots.length ? { qualityHotspots } : {}),
      ...(aiComponents && aiComponents.length ? { aiComponents } : {}),
    };
  }

  private async defaultBranch(base: string, pid: string, ctx: CollectorContext): Promise<string> {
    try {
      const res = await resilientFetch(ctx.fetchImpl, `${base}/api/v4/projects/${pid}`, this.headers(ctx));
      if (!res.ok) return 'main';
      const body = (await res.json()) as { default_branch?: string };
      return body.default_branch ?? 'main';
    } catch {
      return 'main';
    }
  }

  private async listTree(base: string, pid: string, ctx: CollectorContext): Promise<string[]> {
    const paths: string[] = [];
    for (let page = 1; page <= TREE_PAGES; page++) {
      const res = await resilientFetch(
        ctx.fetchImpl,
        `${base}/api/v4/projects/${pid}/repository/tree?recursive=true&per_page=${PER_PAGE}&page=${page}`,
        this.headers(ctx),
      );
      if (!res.ok) break;
      const body = (await res.json()) as GitlabTreeEntry[];
      for (const e of body) if (e.type === 'blob' && e.path) paths.push(e.path);
      if (body.length < PER_PAGE) break;
    }
    return paths;
  }

  private async readFile(
    base: string,
    pid: string,
    path: string,
    branch: string,
    ctx: CollectorContext,
  ): Promise<string | undefined> {
    const enc = encodeURIComponent(path);
    const res = await resilientFetch(
      ctx.fetchImpl,
      `${base}/api/v4/projects/${pid}/repository/files/${enc}/raw?ref=${encodeURIComponent(branch)}`,
      this.headers(ctx),
    );
    if (!res.ok) return undefined;
    return res.text();
  }

  private headers(ctx: CollectorContext): RequestInit {
    return { headers: { 'PRIVATE-TOKEN': ctx.token as string, accept: 'application/json' } };
  }
}
