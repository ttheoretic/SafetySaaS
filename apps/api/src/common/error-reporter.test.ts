import { describe, it, expect, vi } from 'vitest';
import { parseDsn, buildSentryEvent, createErrorReporter } from './error-reporter';

describe('parseDsn', () => {
  it('parses a valid Sentry DSN', () => {
    expect(parseDsn('https://abc123@o1.ingest.sentry.io/456')).toEqual({
      host: 'o1.ingest.sentry.io',
      projectId: '456',
      publicKey: 'abc123',
    });
  });

  it('returns null for an invalid DSN', () => {
    expect(parseDsn('not-a-url')).toBeNull();
    expect(parseDsn('https://o1.ingest.sentry.io/456')).toBeNull(); // no public key
  });
});

describe('buildSentryEvent', () => {
  it('produces a well-formed event with exception + context', () => {
    const e = buildSentryEvent(new Error('boom'), { requestId: 'r1', method: 'GET', url: '/x' }, {
      environment: 'production',
      nowSeconds: 1000,
    });
    expect(e.platform).toBe('node');
    expect(e.level).toBe('error');
    expect(e.environment).toBe('production');
    expect(e.timestamp).toBe(1000);
    expect((e.exception as any).values[0]).toMatchObject({ type: 'Error', value: 'boom' });
    expect((e.tags as any).request_id).toBe('r1');
    expect(e.event_id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('createErrorReporter', () => {
  it('is a no-op without SENTRY_DSN', () => {
    const prev = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    try {
      const r = createErrorReporter();
      expect(r.name).toBe('noop');
      expect(() => r.captureException(new Error('x'))).not.toThrow();
    } finally {
      if (prev) process.env.SENTRY_DSN = prev;
    }
  });

  it('POSTs to the Sentry store endpoint with auth when DSN is set', async () => {
    const prev = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = 'https://pub@o1.ingest.sentry.io/42';
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response) as unknown as typeof fetch;
    try {
      const r = createErrorReporter(fetchImpl);
      expect(r.name).toBe('sentry');
      r.captureException(new Error('boom'), { requestId: 'r9' });
      await new Promise((res) => setTimeout(res, 0)); // let the fire-and-forget settle
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = (fetchImpl as any).mock.calls[0];
      expect(url).toBe('https://o1.ingest.sentry.io/api/42/store/');
      expect((init.headers as any)['X-Sentry-Auth']).toContain('sentry_key=pub');
    } finally {
      if (prev) process.env.SENTRY_DSN = prev;
      else delete process.env.SENTRY_DSN;
    }
  });
});
