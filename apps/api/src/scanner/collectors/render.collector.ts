import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, CloudSignals, NodeKind } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext } from './collector';

interface RenderService {
  id: string;
  name: string;
  type?: string;
  serviceDetails?: { region?: string; numInstances?: number };
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
      const res = await ctx.fetchImpl('https://api.render.com/v1/services?limit=50', {
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
      return { clouds: [{ provider: 'render', services }] };
    } catch (err) {
      this.logger.warn(`Render collector failed: ${(err as Error).message}`);
      return declared ? { clouds: [{ provider: 'render', services: declared }] } : {};
    }
  }
}
