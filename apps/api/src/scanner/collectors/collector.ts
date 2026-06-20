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
  /**
   * Plan entitlements gating deep analysis. Undefined defaults to enabled, so
   * tests and the public analyze path keep full behavior.
   */
  entitlements?: {
    /** Dependency scanning (SCA). */
    sca?: boolean;
    /** Code / secret / IaC analysis (SAST family). */
    codeAudit?: boolean;
    /** Max repositories to scan (plan limit). Infinity / undefined = unlimited. */
    maxRepos?: number;
  };
}

export const EMPTY: Partial<ScanCollection> = {};

/** DI token for the registered provider-specific collectors. */
export const PROVIDER_COLLECTORS = Symbol('PROVIDER_COLLECTORS');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Provider HTTP call with a hard timeout and one retry on transient failures
 * (network error, 429, 5xx). Keeps a slow or flaky provider from stalling the
 * whole scan. Callers still handle the final Response / thrown error and fall
 * back to declared metadata.
 */
export async function resilientFetch(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, retries = 1 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr ?? new Error('request failed');
}
