import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/**
 * Error reporting to Sentry — dependency-free, via Sentry's ingestion HTTP API
 * (no SDK, same pattern as the email/OSV clients). When SENTRY_DSN is set,
 * unexpected server errors are forwarded so they're aggregated and alertable;
 * otherwise it's a no-op. Always fire-and-forget — reporting never throws and
 * never blocks the request.
 */
export interface ErrorContext {
  requestId?: string;
  method?: string;
  url?: string;
  /** Acting user, for Sentry's `user` context. */
  user?: { id?: string; email?: string };
  /** Active workspace/org id, surfaced as a Sentry tag. */
  workspaceId?: string;
  /** Where the error originated, e.g. 'api' | 'worker'. */
  source?: string;
}

export interface ErrorReporter {
  readonly name: string;
  captureException(error: unknown, context?: ErrorContext): void;
}

export interface ParsedDsn {
  host: string;
  projectId: string;
  publicKey: string;
}

/** Parse a Sentry DSN: https://<publicKey>@<host>/<projectId>. */
export function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, '');
    if (!u.username || !u.host || !projectId) return null;
    return { host: u.host, projectId, publicKey: u.username };
  } catch {
    return null;
  }
}

/** Build a minimal Sentry "store" event for an error (pure, testable). */
export function buildSentryEvent(
  error: unknown,
  context: ErrorContext = {},
  opts: { environment?: string; release?: string; nowSeconds?: number } = {},
): Record<string, unknown> {
  const err = error as Error;
  return {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: opts.nowSeconds ?? Math.floor(Date.now() / 1000),
    platform: 'node',
    level: 'error',
    logger: 'riscly-api',
    environment: opts.environment ?? process.env.NODE_ENV ?? 'development',
    ...(opts.release ? { release: opts.release } : {}),
    exception: {
      values: [
        {
          type: err?.name ?? 'Error',
          value: err?.message ?? String(error),
        },
      ],
    },
    tags: {
      ...(context.requestId ? { request_id: context.requestId } : {}),
      ...(context.workspaceId ? { workspace_id: context.workspaceId } : {}),
      ...(context.source ? { source: context.source } : {}),
    },
    ...(context.user?.id || context.user?.email
      ? { user: { id: context.user.id, email: context.user.email } }
      : {}),
    request:
      context.method || context.url
        ? { method: context.method, url: context.url }
        : undefined,
    extra: { stack: err?.stack },
  };
}

class NoopReporter implements ErrorReporter {
  readonly name = 'noop';
  captureException() {
    /* SENTRY_DSN not set — nothing to do */
  }
}

class SentryReporter implements ErrorReporter {
  readonly name = 'sentry';
  private readonly logger = new Logger('ErrorReporter');
  private readonly endpoint: string;
  private readonly authHeader: string;

  constructor(private readonly dsn: ParsedDsn, private readonly fetchImpl: typeof fetch = fetch) {
    this.endpoint = `https://${dsn.host}/api/${dsn.projectId}/store/`;
    this.authHeader = `Sentry sentry_version=7, sentry_client=riscly/1.0, sentry_key=${dsn.publicKey}`;
  }

  captureException(error: unknown, context: ErrorContext = {}) {
    const event = buildSentryEvent(error, context, { release: process.env.GIT_SHA });
    // Fire-and-forget; reporting must never affect the response.
    void this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Sentry-Auth': this.authHeader },
      body: JSON.stringify(event),
    }).catch((e) => this.logger.warn(`Sentry report failed: ${(e as Error).message}`));
  }
}

/** Build the reporter from the environment (SENTRY_DSN). */
export function createErrorReporter(fetchImpl: typeof fetch = fetch): ErrorReporter {
  const dsn = process.env.SENTRY_DSN ? parseDsn(process.env.SENTRY_DSN) : null;
  if (dsn) {
    Logger.log('Error reporting: Sentry active.', 'ErrorReporter');
    return new SentryReporter(dsn, fetchImpl);
  }
  return new NoopReporter();
}
