import { describe, it, expect, vi } from 'vitest';
import { SupabaseCollector } from './supabase.collector';
import type { CollectorContext } from './collector';
import type { ConnectionRecord } from '../../store/store.module';

function ctxWith(fetchImpl: typeof fetch): CollectorContext {
  return { fetchImpl };
}

const conn = (metadata: Record<string, unknown>): ConnectionRecord =>
  ({ id: 'c1', provider: 'supabase', metadata } as unknown as ConnectionRecord);

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

describe('SupabaseCollector', () => {
  it('flags insecure auth settings and anon-readable tables via the project URL', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/settings')) {
        return json({ disable_signup: false, mailer_autoconfirm: true });
      }
      if (url.endsWith('/rest/v1/')) {
        return json({ definitions: { profiles: {}, private_keys: {} } });
      }
      if (url.includes('/rest/v1/profiles')) return json([{ id: 1 }]); // anon CAN read
      if (url.includes('/rest/v1/private_keys')) return json({}, false, 401); // protected
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const collector = new SupabaseCollector();
    const res = await collector.collect(
      conn({ url: 'https://abc.supabase.co', anonKey: 'anon-key' }),
      ctxWith(fetchImpl),
    );

    const titles = (res.findings ?? []).map((f) => f.title);
    expect(titles.some((t) => t.includes('open user sign-up'))).toBe(true);
    expect(titles.some((t) => t.includes('email auto-confirm'))).toBe(true);
    expect(titles.some((t) => t.includes('"profiles" is readable by anonymous'))).toBe(true);
    // The protected table must NOT be flagged.
    expect(titles.some((t) => t.includes('private_keys'))).toBe(false);
    // Still records the database node.
    expect(res.databases?.[0]?.provider).toBe('supabase');
  });

  it('produces no findings when auth is locked down and RLS protects tables', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/auth/v1/settings')) {
        return json({ disable_signup: true, mailer_autoconfirm: false });
      }
      if (url.endsWith('/rest/v1/')) return json({ definitions: { profiles: {} } });
      if (url.includes('/rest/v1/profiles')) return json({}, false, 401);
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const res = await new SupabaseCollector().collect(
      conn({ url: 'https://abc.supabase.co', anonKey: 'anon-key' }),
      ctxWith(fetchImpl),
    );
    expect(res.findings ?? []).toHaveLength(0);
  });

  it('falls back to declared metadata with no token or url', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const res = await new SupabaseCollector().collect(
      conn({ name: 'orders-db' }),
      ctxWith(fetchImpl),
    );
    expect(res.databases?.[0]?.name).toBe('orders-db');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
