import { describe, it, expect, vi } from 'vitest';
import { StripeCollector } from './stripe.collector';
import { VercelCollector } from './vercel.collector';
import { RenderCollector } from './render.collector';
import { NeonCollector } from './neon.collector';
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

  it('scopes to selected projects when set', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/v9/projects') && !url.includes('/env')) {
        return json({ projects: [{ id: 'p1', name: 'web' }, { id: 'p2', name: 'unrelated' }] });
      }
      if (url.includes('/env')) return json({ envs: [] });
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const res = await new VercelCollector().collect(
      conn('vercel', { selectedProjects: ['web'] }),
      ctxWith(fetchImpl, 'tok'),
    );
    const names = res.clouds?.[0]?.services?.map((s) => s.name);
    expect(names).toEqual(['web']); // "unrelated" filtered out
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

describe('RenderCollector verified findings', () => {
  it('flags a Postgres instance open to 0.0.0.0/0', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/v1/services')) return json([{ service: { id: 's1', name: 'api', type: 'web_service' } }]);
      if (url.includes('/v1/postgres')) {
        return json([
          { postgres: { id: 'pg1', name: 'orders', ipAllowList: [{ cidrBlock: '0.0.0.0/0' }] } },
          { postgres: { id: 'pg2', name: 'internal', ipAllowList: [{ cidrBlock: '10.0.0.0/8' }] } },
        ]);
      }
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const res = await new RenderCollector().collect(conn('render'), ctxWith(fetchImpl, 'tok'));
    const titles = (res.findings ?? []).map((f) => f.title);
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain('"orders" is open to the public internet');
    expect(res.databases?.length).toBe(2);
  });
});

describe('NeonCollector verified findings', () => {
  it('flags a project with no IP allow list', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/api/v2/projects')) {
        return json({
          projects: [
            { id: 'a', name: 'open-db', settings: { allowed_ips: { ips: [] } } },
            { id: 'b', name: 'locked-db', settings: { allowed_ips: { ips: ['1.2.3.4'] } } },
          ],
        });
      }
      return json({}, false, 404);
    }) as unknown as typeof fetch;

    const res = await new NeonCollector().collect(conn('neon'), ctxWith(fetchImpl, 'tok'));
    const titles = (res.findings ?? []).map((f) => f.title);
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain('"open-db" has no IP allow list');
  });
});
