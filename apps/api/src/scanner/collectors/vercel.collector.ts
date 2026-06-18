import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, CloudSignals } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch } from './collector';

interface VercelProject {
  id: string;
  name: string;
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
      const services: NonNullable<CloudSignals['services']> = (body.projects ?? [])
        .slice(0, 25)
        .map((p) => ({
          id: `vercel-${p.name}`,
          name: p.name,
          kind: 'frontend' as const,
          // Vercel serves from a global edge network — inherently redundant.
          redundant: true,
        }));
      return { clouds: [{ provider: 'vercel', regions: ['global'], services }] };
    } catch (err) {
      this.logger.warn(`Vercel collector failed: ${(err as Error).message}`);
      return declared ? { clouds: [{ provider: 'vercel', services: declared }] } : {};
    }
  }
}
