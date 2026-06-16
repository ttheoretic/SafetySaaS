import { Injectable } from '@nestjs/common';
import type {
  ScanCollection,
  CloudSignals,
  DatabaseSignals,
} from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext } from './collector';

const CLOUD_PROVIDERS = new Set(['aws', 'azure', 'gcp', 'vercel', 'railway', 'render']);
const DB_PROVIDERS = new Set(['supabase', 'neon']);

/**
 * Catch-all collector for providers whose topology is best described
 * declaratively via the connection's metadata (billing, managed databases and
 * cloud resources). Live cloud-inventory APIs would slot in here per provider;
 * the metadata path keeps scans useful before those integrations exist.
 */
@Injectable()
export class MetadataCollector implements ProviderCollector {
  readonly provider = '*';

  async collect(
    connection: ConnectionRecord,
    _ctx: CollectorContext,
  ): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const provider = connection.provider;

    if (provider === 'stripe') {
      return { billing: [{ provider: 'stripe', live: meta.live !== false }] };
    }

    if (DB_PROVIDERS.has(provider)) {
      const db: DatabaseSignals = {
        provider: provider as DatabaseSignals['provider'],
        name: (meta.name as string) ?? `${provider} database`,
        region: meta.region as string | undefined,
        redundant: meta.redundant as boolean | undefined,
        hasBackup: meta.hasBackup as boolean | undefined,
      };
      return { databases: [db] };
    }

    if (CLOUD_PROVIDERS.has(provider)) {
      const cloud: CloudSignals = {
        provider: provider as CloudSignals['provider'],
        regions: (meta.regions as string[] | undefined) ?? undefined,
        services: (meta.services as CloudSignals['services']) ?? [],
      };
      return { clouds: [cloud] };
    }

    return {};
  }
}
