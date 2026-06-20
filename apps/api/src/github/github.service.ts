import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Store } from '../store/store.module';
import { SecretBox } from '../crypto/secret-box';

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  repo: string;
  date: string;
  url: string;
}

export interface RepoFile {
  path: string;
  /** File size in bytes, when reported by the tree API. */
  size?: number;
}

interface GithubContext {
  token: string;
  repos: string[];
}

type FetchLike = typeof fetch;

/**
 * Read/write access to a project's connected GitHub account. Resolves the
 * project's GitHub connection, decrypts its token, and exposes the handful of
 * GitHub API calls the product needs (commits, file tree, file content, PRs).
 * Returns empty/null gracefully when no GitHub connection exists so callers can
 * fall back to demo data.
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly store: Store,
    private readonly secrets: SecretBox,
    fetchImpl?: FetchLike,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  /** Resolve token + repos for a project's GitHub connection (tenant-checked). */
  private async context(
    projectId: string,
    orgId: string,
  ): Promise<GithubContext | null> {
    const project = await this.store.getProject(projectId);
    if (!project || project.orgId !== orgId) {
      throw new NotFoundException('Project not found');
    }
    const conns = await this.store.listConnections(projectId);
    const gh = conns.find((c) => c.provider === 'github' && c.encryptedToken);
    if (!gh?.encryptedToken) return null;
    const token = this.secrets.decrypt(gh.encryptedToken);
    const meta = gh.metadata ?? {};
    const selected = Array.isArray(meta.selectedRepos)
      ? (meta.selectedRepos as string[])
      : [];
    const all = Array.isArray(meta.repos) ? (meta.repos as string[]) : [];
    const repos = selected.length > 0 ? selected : all;
    return { token, repos };
  }

  private headers(token: string): Record<string, string> {
    return {
      accept: 'application/vnd.github+json',
      'user-agent': 'riscly',
      authorization: `Bearer ${token}`,
    };
  }

  /** Whether the project has a usable GitHub connection. */
  async isConnected(projectId: string, orgId: string): Promise<boolean> {
    return (await this.context(projectId, orgId)) !== null;
  }

  /** Recent commits across the connection's selected repos, newest first. */
  async listCommits(
    projectId: string,
    orgId: string,
    limit = 10,
  ): Promise<CommitInfo[]> {
    const ctx = await this.context(projectId, orgId);
    if (!ctx) return [];
    const out: CommitInfo[] = [];
    for (const repo of ctx.repos.slice(0, 3)) {
      try {
        const res = await this.fetchImpl(
          `https://api.github.com/repos/${repo}/commits?per_page=${limit}`,
          { headers: this.headers(ctx.token) },
        );
        if (!res.ok) continue;
        const arr = (await res.json()) as Array<{
          sha?: string;
          html_url?: string;
          commit?: { message?: string; author?: { name?: string; date?: string } };
          author?: { login?: string };
        }>;
        for (const c of arr) {
          out.push({
            sha: (c.sha ?? '').slice(0, 7),
            message: (c.commit?.message ?? '').split('\n')[0],
            author: c.commit?.author?.name ?? c.author?.login ?? 'unknown',
            repo,
            date: c.commit?.author?.date ?? new Date().toISOString(),
            url: c.html_url ?? '',
          });
        }
      } catch (err) {
        this.logger.warn(`listCommits ${repo}: ${(err as Error).message}`);
      }
    }
    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return out.slice(0, limit);
  }

  /** Repos available to the connection (selected, else all discovered). */
  async listRepos(projectId: string, orgId: string): Promise<string[]> {
    const ctx = await this.context(projectId, orgId);
    return ctx?.repos ?? [];
  }

  /** Flat list of blob paths in a repo's default branch. */
  async listFiles(
    projectId: string,
    orgId: string,
    repo: string,
  ): Promise<RepoFile[]> {
    const ctx = await this.context(projectId, orgId);
    if (!ctx || !ctx.repos.includes(repo)) return [];
    try {
      const res = await this.fetchImpl(
        `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
        { headers: this.headers(ctx.token) },
      );
      if (!res.ok) return [];
      const body = (await res.json()) as {
        tree?: Array<{ path?: string; type?: string; size?: number }>;
      };
      return (body.tree ?? [])
        .filter((t) => t.type === 'blob' && t.path)
        .map((t) => ({ path: t.path as string, size: t.size }));
    } catch (err) {
      this.logger.warn(`listFiles ${repo}: ${(err as Error).message}`);
      return [];
    }
  }

  /** Decoded UTF-8 content of a file, or null. */
  async readFile(
    projectId: string,
    orgId: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    const ctx = await this.context(projectId, orgId);
    if (!ctx || !ctx.repos.includes(repo)) return null;
    try {
      const res = await this.fetchImpl(
        `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(
          path,
        ).replace(/%2F/g, '/')}`,
        { headers: this.headers(ctx.token) },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { content?: string; encoding?: string };
      if (!body.content) return null;
      return Buffer.from(
        body.content,
        (body.encoding as BufferEncoding) ?? 'base64',
      ).toString('utf8');
    } catch (err) {
      this.logger.warn(`readFile ${repo}/${path}: ${(err as Error).message}`);
      return null;
    }
  }
}
