import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, DatabaseSignals } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch } from './collector';

interface NeonProject {
  id: string;
  name: string;
  region_id?: string;
}

/**
 * Collects managed Postgres databases from Neon via its API. Neon provides
 * point-in-time recovery, so backups are on by default. Falls back to declared
 * metadata without a token; resilient on any failure.
 */
@Injectable()
export class NeonCollector implements ProviderCollector {
  readonly provider = 'neon';
  private readonly logger = new Logger(NeonCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const fallback: DatabaseSignals = {
      provider: 'neon',
      name: (meta.name as string) ?? 'Neon Postgres',
      region: meta.region as string | undefined,
      hasBackup: (meta.hasBackup as boolean | undefined) ?? true,
      redundant: meta.redundant as boolean | undefined,
    };
    if (!ctx.token) return { databases: [fallback] };

    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://console.neon.tech/api/v2/projects', {
        headers: { Authorization: `Bearer ${ctx.token}`, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Neon API ${res.status}`);
      const body = (await res.json()) as { projects?: NeonProject[] };
      const dbs: DatabaseSignals[] = (body.projects ?? []).slice(0, 25).map((p) => ({
        provider: 'neon',
        name: p.name,
        region: p.region_id,
        hasBackup: true,
        redundant: false,
      }));
      return { databases: dbs.length ? dbs : [fallback] };
    } catch (err) {
      this.logger.warn(`Neon collector failed: ${(err as Error).message}`);
      return { databases: [fallback] };
    }
  }
}
