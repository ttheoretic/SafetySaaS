import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, CloudSignals, Finding } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import {
  ProviderCollector,
  CollectorContext,
  resilientFetch,
  mapWithConcurrency,
} from './collector';

interface VercelProject {
  id: string;
  name: string;
  /** Connected git repository, when the project is linked to one. */
  link?: { type?: string; org?: string; repo?: string; repoId?: number };
}

interface VercelEnv {
  key: string;
  type?: string; // 'plain' | 'encrypted' | 'secret' | 'sensitive' | 'system'
  target?: string[];
}

/**
 * Collects hosting topology from Vercel. With an access token it lists the
 * account's projects (each a globally-distributed, redundant frontend) via the
 * Vercel REST API; without a token it falls back to any services declared in
 * the connection metadata. Resilient by contract — returns partial signals on
 * any failure so a Vercel hiccup never aborts the scan.
 */
@Injectable()
export class VercelCollector implements ProviderCollector {
  readonly provider = 'vercel';
  private readonly logger = new Logger(VercelCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const declared = (meta.services as CloudSignals['services']) ?? undefined;

    if (!ctx.token) {
      return declared ? { clouds: [{ provider: 'vercel', services: declared }] } : {};
    }

    try {
      const teamId = typeof meta.teamId === 'string' ? `?teamId=${meta.teamId}` : '';
      const res = await resilientFetch(ctx.fetchImpl, `https://api.vercel.com/v9/projects${teamId}`, {
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      if (!res.ok) throw new Error(`Vercel API ${res.status}`);
      const body = (await res.json()) as { projects?: VercelProject[] };
      const all = body.projects ?? [];
      // Org tokens see every project. Narrow to the ones that belong to THIS
      // Riscly project so unrelated projects don't pollute the architecture:
      //   1. an explicit `selectedProjects` list always wins;
      //   2. otherwise keep projects whose linked git repo matches a connected
      //      repo (`owner/name`); 3. if neither applies (no hints, no link
      //      data), fall back to all so a standalone Vercel connection still works.
      const selected = Array.isArray(meta.selectedProjects)
        ? (meta.selectedProjects as string[]).map((s) => s.toLowerCase())
        : null;
      const hints = (ctx.repoHints ?? []).map((s) => s.toLowerCase());
      const byRepo = (p: VercelProject): boolean => {
        if (!p.link?.repo) return false;
        const full = `${p.link.org ?? ''}/${p.link.repo}`.toLowerCase();
        const name = p.link.repo.toLowerCase();
        return hints.some((h) => h === full || h.split('/').pop() === name);
      };
      let projects: VercelProject[];
      if (selected) {
        projects = all.filter((p) => selected.includes(p.name.toLowerCase()));
      } else if (hints.length && all.some(byRepo)) {
        projects = all.filter(byRepo);
      } else {
        projects = all;
      }
      projects = projects.slice(0, 25);
      const services: NonNullable<CloudSignals['services']> = projects.map((p) => ({
        id: `vercel-${p.name}`,
        name: p.name,
        kind: 'frontend' as const,
        // Vercel serves from a global edge network — inherently redundant.
        redundant: true,
      }));
      const findings = await this.auditEnv(projects, teamId, ctx);
      return {
        clouds: [{ provider: 'vercel', regions: ['global'], services }],
        ...(findings.length ? { findings } : {}),
      };
    } catch (err) {
      this.logger.warn(`Vercel collector failed: ${(err as Error).message}`);
      return declared ? { clouds: [{ provider: 'vercel', services: declared }] } : {};
    }
  }

  /** Flag environment variables stored as plaintext ('plain') rather than
   *  encrypted/sensitive — anyone with project read access sees their values. */
  private async auditEnv(
    projects: VercelProject[],
    teamId: string,
    ctx: CollectorContext,
  ): Promise<Finding[]> {
    const perProject = await mapWithConcurrency(projects.slice(0, 12), 4, async (p) => {
      try {
        const res = await resilientFetch(
          ctx.fetchImpl,
          `https://api.vercel.com/v9/projects/${encodeURIComponent(p.id)}/env${teamId}`,
          { headers: { Authorization: `Bearer ${ctx.token}` } },
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { envs?: VercelEnv[] };
        const plain = (body.envs ?? []).filter((e) => e.type === 'plain').map((e) => e.key);
        return plain.length ? { project: p.name, keys: plain } : null;
      } catch {
        return null;
      }
    });

    return perProject
      .filter((x): x is { project: string; keys: string[] } => Boolean(x))
      .slice(0, 8)
      .map(({ project, keys }) => ({
        category: 'security',
        severity: 'medium',
        title: `Vercel: ${keys.length} plaintext env var${keys.length === 1 ? '' : 's'} in "${project}"`,
        description:
          `Environment variables are stored as plaintext (${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '…' : ''}) and are readable by anyone with project access. Mark secrets as Sensitive/Encrypted so their values are not exposed.`,
        weight: 8,
      }));
  }
}
