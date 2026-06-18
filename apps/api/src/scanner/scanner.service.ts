import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  buildSystemGraph,
  ScanCollection,
  SystemGraph,
} from '@riscly/shared';
import type { ConnectionRecord } from '../store/store.module';
import { CollectorContext, ProviderCollector, PROVIDER_COLLECTORS } from './collectors/collector';
import { MetadataCollector } from './collectors/metadata.collector';

/**
 * Orchestrates provider collectors into a single SystemGraph.
 *
 * For each connection it picks the matching collector (provider-specific, else
 * the metadata fallback), runs them in parallel with that connection's own
 * decrypted token, merges the collected signals and hands them to the pure
 * scanner. A failing provider is logged and skipped so partial connectivity
 * still yields a useful graph. New providers register a collector — no changes
 * here are required.
 */
@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly specific: Map<string, ProviderCollector>;

  constructor(
    @Inject(PROVIDER_COLLECTORS) collectors: ProviderCollector[],
    private readonly metadata: MetadataCollector,
  ) {
    this.specific = new Map(collectors.map((c) => [c.provider, c]));
  }

  async scan(
    connections: ConnectionRecord[],
    opts: {
      /** Per-connection decrypted tokens, keyed by connection id. */
      tokens?: Record<string, string>;
      /** Fallback token applied to every connection (back-compat / tests). */
      token?: string;
      fetchImpl?: typeof fetch;
    } = {},
  ): Promise<SystemGraph> {
    const fetchImpl = opts.fetchImpl ?? fetch;

    const collected = await Promise.all(
      connections.map(async (conn) => {
        const collector = this.specific.get(conn.provider) ?? this.metadata;
        const ctx: CollectorContext = {
          token: opts.tokens?.[conn.id] ?? opts.token,
          fetchImpl,
        };
        try {
          return await collector.collect(conn, ctx);
        } catch (err) {
          this.logger.warn(
            `Collector for ${conn.provider} failed: ${(err as Error).message}`,
          );
          return {} as Partial<ScanCollection>;
        }
      }),
    );

    return buildSystemGraph(mergeCollections(collected));
  }
}

function mergeCollections(parts: Partial<ScanCollection>[]): ScanCollection {
  const merged: ScanCollection = {
    repos: [],
    clouds: [],
    databases: [],
    billing: [],
  };
  for (const part of parts) {
    merged.repos!.push(...(part.repos ?? []));
    merged.clouds!.push(...(part.clouds ?? []));
    merged.databases!.push(...(part.databases ?? []));
    merged.billing!.push(...(part.billing ?? []));
  }
  return merged;
}
