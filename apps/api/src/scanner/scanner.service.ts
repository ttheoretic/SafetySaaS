import { Injectable, Logger } from '@nestjs/common';
import {
  buildSystemGraph,
  ScanCollection,
  SystemGraph,
} from '@failsafe/shared';
import type { ConnectionRecord } from '../store/store.module';
import { CollectorContext, ProviderCollector } from './collectors/collector';
import { GithubCollector } from './collectors/github.collector';
import { MetadataCollector } from './collectors/metadata.collector';

/**
 * Orchestrates provider collectors into a single SystemGraph.
 *
 * For each connection it picks the matching collector (provider-specific, else
 * the metadata fallback), runs them in parallel, merges the collected signals
 * and hands them to the pure scanner. A failing provider is logged and skipped
 * so partial connectivity still yields a useful graph.
 */
@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly specific: Map<string, ProviderCollector>;

  constructor(
    github: GithubCollector,
    private readonly metadata: MetadataCollector,
  ) {
    this.specific = new Map([[github.provider, github]]);
  }

  async scan(
    connections: ConnectionRecord[],
    opts: { token?: string; fetchImpl?: typeof fetch } = {},
  ): Promise<SystemGraph> {
    const ctx: CollectorContext = {
      token: opts.token,
      fetchImpl: opts.fetchImpl ?? fetch,
    };

    const collected = await Promise.all(
      connections.map(async (conn) => {
        const collector = this.specific.get(conn.provider) ?? this.metadata;
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
