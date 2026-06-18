import { describe, it, expect } from 'vitest';
import { ScannerService } from './scanner.service';
import { GithubCollector } from './collectors/github.collector';
import { VercelCollector } from './collectors/vercel.collector';
import { StripeCollector } from './collectors/stripe.collector';
import { MetadataCollector } from './collectors/metadata.collector';
import type { ConnectionRecord } from '../store/store.module';

function makeService() {
  return new ScannerService(
    [new GithubCollector(), new VercelCollector(), new StripeCollector()],
    new MetadataCollector(),
  );
}

function conn(partial: Partial<ConnectionRecord>): ConnectionRecord {
  return {
    id: 'c1',
    orgId: 'org',
    projectId: 'p1',
    provider: 'github',
    status: 'active',
    metadata: {},
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/** A fake GitHub contents API returning a package.json. */
function fakeGithubFetch(pkg: object): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    if (init?.method === 'HEAD') return { ok: false } as Response;
    if (String(url).endsWith('package.json')) {
      return {
        ok: true,
        json: async () => ({
          encoding: 'base64',
          content: Buffer.from(JSON.stringify(pkg)).toString('base64'),
        }),
      } as Response;
    }
    return { ok: false } as Response;
  }) as unknown as typeof fetch;
}

describe('ScannerService', () => {
  it('builds a graph from a live GitHub package.json (mocked fetch)', async () => {
    const service = makeService();
    const fetchImpl = fakeGithubFetch({
      dependencies: { next: '14', '@nestjs/core': '10', pg: '8', stripe: '14' },
    });

    const graph = await service.scan(
      [conn({ provider: 'github', metadata: { repos: ['acme/app'] } })],
      { token: 'gh_token', fetchImpl },
    );

    const ids = graph.nodes.map((n) => n.id);
    expect(ids).toContain('app-frontend');
    expect(ids).toContain('app-api');
    expect(ids).toContain('postgres');
    expect(ids).toContain('stripe');
  });

  it('combines GitHub, a managed DB and Stripe connections', async () => {
    const service = makeService();
    const fetchImpl = fakeGithubFetch({
      dependencies: { '@nestjs/core': '10', prisma: '5' },
    });

    const graph = await service.scan(
      [
        conn({ provider: 'github', metadata: { repos: ['acme/api'] } }),
        conn({
          id: 'c2',
          provider: 'neon',
          metadata: { name: 'Primary DB', region: 'eu-central-1', hasBackup: false },
        }),
        conn({ id: 'c3', provider: 'stripe', metadata: { live: true } }),
      ],
      { token: 'gh_token', fetchImpl },
    );

    expect(graph.nodes.some((n) => n.provider === 'neon')).toBe(true);
    expect(graph.nodes.some((n) => n.id === 'stripe')).toBe(true);
    // The managed DB must be wired into the graph, not orphaned.
    const neon = graph.nodes.find((n) => n.provider === 'neon')!;
    expect(graph.edges.some((e) => e.to === neon.id)).toBe(true);
  });

  it('skips a failing collector without aborting the scan', async () => {
    const service = makeService();
    const exploding: typeof fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const graph = await service.scan(
      [
        conn({ provider: 'github', metadata: { repos: ['acme/app'] } }),
        conn({ id: 'c2', provider: 'stripe', metadata: { live: true } }),
      ],
      { token: 'gh', fetchImpl: exploding },
    );

    // GitHub failed but Stripe still contributed.
    expect(graph.nodes.some((n) => n.id === 'stripe')).toBe(true);
  });
});
