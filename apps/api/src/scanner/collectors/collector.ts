import type { ScanCollection } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';

/**
 * A collector turns one provider connection into normalized scan signals by
 * doing the actual provider I/O. Collectors must be resilient: a single
 * provider failing should never abort the whole scan, so `collect` should
 * resolve with whatever it managed to gather (possibly empty).
 */
export interface ProviderCollector {
  readonly provider: string;
  collect(
    connection: ConnectionRecord,
    ctx: CollectorContext,
  ): Promise<Partial<ScanCollection>>;
}

export interface CollectorContext {
  /** Decrypted access token for THIS connection, if available. */
  token?: string;
  /** Injected so collectors are testable without hitting the network. */
  fetchImpl: typeof fetch;
}

export const EMPTY: Partial<ScanCollection> = {};

/** DI token for the registered provider-specific collectors. */
export const PROVIDER_COLLECTORS = Symbol('PROVIDER_COLLECTORS');
