import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, DatabaseSignals } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch } from './collector';

interface SupabaseProject {
  id: string;
  name: string;
  region?: string;
}

/**
 * Collects Supabase projects (managed Postgres) via the Management API.
 * Supabase runs automated backups, so backups default to on. Falls back to
 * declared metadata without a token; resilient on any failure.
 */
@Injectable()
export class SupabaseCollector implements ProviderCollector {
  readonly provider = 'supabase';
  private readonly logger = new Logger(SupabaseCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const fallback: DatabaseSignals = {
      provider: 'supabase',
      name: (meta.name as string) ?? 'Supabase',
      region: meta.region as string | undefined,
      hasBackup: (meta.hasBackup as boolean | undefined) ?? true,
      redundant: meta.redundant as boolean | undefined,
    };
    if (!ctx.token) return { databases: [fallback] };

    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${ctx.token}`, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Supabase API ${res.status}`);
      const body = (await res.json()) as SupabaseProject[];
      const dbs: DatabaseSignals[] = (body ?? []).slice(0, 25).map((p) => ({
        provider: 'supabase',
        name: p.name,
        region: p.region,
        hasBackup: true,
      }));
      return { databases: dbs.length ? dbs : [fallback] };
    } catch (err) {
      this.logger.warn(`Supabase collector failed: ${(err as Error).message}`);
      return { databases: [fallback] };
    }
  }
}
