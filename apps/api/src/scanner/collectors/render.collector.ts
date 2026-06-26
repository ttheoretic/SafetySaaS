import { Injectable, Logger } from '@nestjs/common';
import type {
  ScanCollection,
  CloudSignals,
  DatabaseSignals,
  Finding,
  NodeKind,
} from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch } from './collector';

interface RenderService {
  id: string;
  name: string;
  type?: string;
  serviceDetails?: { region?: string; numInstances?: number };
}

interface RenderPostgres {
  id: string;
  name: string;
  region?: string;
  ipAllowList?: Array<{ cidrBlock?: string; description?: string }>;
}

function kindOf(type?: string): NodeKind {
  if (type === 'static_site') return 'frontend';
  if (type === 'web_service') return 'api';
  return 'service';
}

/**
 * Collects services from Render via its REST API. Maps each service to a node
 * with its region and redundancy (instance count). Falls back to declared
 * metadata without a token; resilient on any failure.
 */
@Injectable()
export class RenderCollector implements ProviderCollector {
  readonly provider = 'render';
  private readonly logger = new Logger(RenderCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const declared = (meta.services as CloudSignals['services']) ?? undefined;
    if (!ctx.token) return declared ? { clouds: [{ provider: 'render', services: declared }] } : {};

    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://api.render.com/v1/services?limit=50', {
        headers: { Authorization: `Bearer ${ctx.token}`, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Render API ${res.status}`);
      // Render returns [{ service: {...}, cursor }].
      const body = (await res.json()) as Array<{ service?: RenderService }>;
      const services: NonNullable<CloudSignals['services']> = body
        .map((w) => w.service)
        .filter((s): s is RenderService => Boolean(s))
        .map((s) => ({
          id: `render-${s.name}`,
          name: s.name,
          kind: kindOf(s.type),
          region: s.serviceDetails?.region,
          redundant: (s.serviceDetails?.numInstances ?? 1) > 1,
        }));
      const { databases, findings } = await this.auditPostgres(ctx);
      return {
        clouds: [{ provider: 'render', services }],
        ...(databases.length ? { databases } : {}),
        ...(findings.length ? { findings } : {}),
      };
    } catch (err) {
      this.logger.warn(`Render collector failed: ${(err as Error).message}`);
      return declared ? { clouds: [{ provider: 'render', services: declared }] } : {};
    }
  }

  /** Inventory managed Postgres and flag any instance whose IP allow list opens
   *  it to the public internet (0.0.0.0/0). */
  private async auditPostgres(
    ctx: CollectorContext,
  ): Promise<{ databases: DatabaseSignals[]; findings: Finding[] }> {
    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://api.render.com/v1/postgres?limit=50', {
        headers: { Authorization: `Bearer ${ctx.token}`, accept: 'application/json' },
      });
      if (!res.ok) return { databases: [], findings: [] };
      const body = (await res.json()) as Array<{ postgres?: RenderPostgres }>;
      const dbs = body.map((w) => w.postgres).filter((p): p is RenderPostgres => Boolean(p));

      const databases: DatabaseSignals[] = dbs.map((p) => ({
        provider: 'render',
        name: p.name,
        region: p.region,
        hasBackup: true,
      }));
      const findings: Finding[] = dbs
        .filter((p) => (p.ipAllowList ?? []).some((e) => e.cidrBlock === '0.0.0.0/0'))
        .slice(0, 8)
        .map((p) => ({
          category: 'security',
          severity: 'critical',
          title: `Render Postgres "${p.name}" is open to the public internet`,
          description:
            'The database IP allow list contains 0.0.0.0/0, so it accepts connections from any address. Restrict the allow list to your services / known IPs.',
          weight: 22,
        }));
      return { databases, findings };
    } catch (err) {
      this.logger.warn(`Render postgres audit failed: ${(err as Error).message}`);
      return { databases: [], findings: [] };
    }
  }
}
