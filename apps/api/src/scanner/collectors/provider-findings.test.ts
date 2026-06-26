import { describe, it, expect, vi } from 'vitest';
import { StripeCollector } from './stripe.collector';
import { VercelCollector } from './vercel.collector';
import type { CollectorContext } from './collector';
import type { ConnectionRecord } from '../../store/store.module';

const ctxWith = (fetchImpl: typeof fetch, token?: string): CollectorContext => ({
  fetchImpl,
  token,
});
const conn = (provider: string, metadata: Record<string, unknown> = {}): ConnectionRecord =>
  ({ id: 'c', provider, metadata } as unknown as ConnectionRecord);
const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

describe('StripeCollector verified findings', () => {
  it('flags an active webhook served over plain HTTP', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/v1/balance')) return json({ livemode: true });
      if (url.includes('/v1/webhook_endpoints')) {
        return json({
          data: [
            { id: 'we_1', url: 'http://example.com/hook', status: 'enabled' },
            { id: 'we_2', url: 'https://secure.example.com/hook', status: 'enabled' },
            { id: 'we_3', url: 'http://dead.example.com', status: 'disabled' },
          ],
        });
      }
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const res = await new StripeCollector().collect(conn('stripe'), ctxWith(fetchImpl, 'sk_live_x'));
    const titles = (res.findings ?? []).map((f) => f.title);
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain('http://example.com/hook');
    expect(res.billing?.[0]?.live).toBe(true);
  });

  it('no findings when all webhooks use HTTPS', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/v1/balance')) return json({ livemode: false });
      if (url.includes('/v1/webhook_endpoints'))
        return json({ data: [{ id: 'we_1', url: 'https://x.example.com/h', status: 'enabled' }] });
      return json({}, false, 404);
    }) as unknown as typeof fetch;
    const res = await new StripeCollector().collect(conn('stripe'), ctxWith(fetchImpl, 'sk_test_x'));
    expect(res.findings ?? []).toHaveLength(0);
  });
});

describe('VercelCollector verified findings', () => {
  it('flags plaintext environment variables per project', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/v9/projects/') && url.includes('/env')) {
        return json({
          envs: [
            { key: 'API_SECRET', type: 'plain' },
            { key: 'DB_URL', type: 'plain' },
            { key: 'PUBLIC_FLAG', type: 'encrypted' },
          ],
        });
      }
      if (url.includes('/v9/projects')) {
        return json({ projects: [{ id: 'p1', name: 'web' }] });
      }
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const res = await new VercelCollector().collect(conn('vercel'), ctxWith(fetchImpl, 'tok'));
    const f = res.findings ?? [];
    expect(f).toHaveLength(1);
    expect(f[0].title).toContain('2 plaintext env vars');
    expect(f[0].description).toContain('API_SECRET');
    expect(res.clouds?.[0]?.services?.[0]?.name).toBe('web');
  });

  it('no findings when env vars are encrypted', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/env')) return json({ envs: [{ key: 'X', type: 'encrypted' }] });
      if (url.includes('/v9/projects')) return json({ projects: [{ id: 'p1', name: 'web' }] });
      return json({}, false, 404);
    }) as unknown as typeof fetch;
    const res = await new VercelCollector().collect(conn('vercel'), ctxWith(fetchImpl, 'tok'));
    expect(res.findings ?? []).toHaveLength(0);
  });
});
