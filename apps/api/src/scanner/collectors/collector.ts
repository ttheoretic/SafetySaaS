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
   * Repositories connected to THIS project (as `owner/name`), gathered from the
   * sibling source connections. Lets account/org-scoped providers (e.g. a Vercel
   * org token that sees every project) narrow to just the ones linked to this
   * project's repo, instead of polluting the map with unrelated projects.
   */
  repoHints?: string[];
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
 * Run `fn` over `items` with at most `limit` in flight at once, preserving order.
 * Keeps a large repo (dozens of files) from firing dozens of simultaneous
 * requests and exhausting sockets / hitting rate limits.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const size = Math.max(1, Math.min(limit, items.length || 1));
  const workers = Array.from({ length: size }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Resolve to `onTimeout()` if `p` hasn't settled within `ms`. The underlying
 * work may keep running, but the caller stops waiting — so one stuck provider
 * can never hang the whole scan. Rejections also fall back to `onTimeout()`.
 */
export function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  onTimeout: () => T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(onTimeout());
      },
    );
  });
}

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
