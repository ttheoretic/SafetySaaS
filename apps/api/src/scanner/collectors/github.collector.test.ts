import { describe, it, expect, vi } from 'vitest';
import { GithubCollector } from './github.collector';
import type { ConnectionRecord } from '../../store/store.module';

function connection(metadata: Record<string, unknown>): ConnectionRecord {
  return {
    id: 'c1', orgId: 'o1', projectId: 'p1', provider: 'github',
    status: 'active', metadata, createdAt: new Date().toISOString(),
  };
}

/** A fetch that returns a package.json for any repo's contents API. */
function fakeGithubFetch() {
  const seen: string[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    const m = url.match(/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/);
    const repo = m?.[1];
    const path = m?.[2];
    if (init?.method === 'HEAD') return { ok: false } as Response;
    if (path === 'package.json' && repo) {
      seen.push(repo);
      const content = Buffer.from(JSON.stringify({ dependencies: { next: '14' } })).toString('base64');
      return { ok: true, json: async () => ({ content, encoding: 'base64' }) } as unknown as Response;
    }
    return { ok: false } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, seen };
}

describe('GithubCollector repo selection', () => {
  it('scans only the selected repos when selectedRepos is set', async () => {
    const { fetchImpl, seen } = fakeGithubFetch();
    const collector = new GithubCollector();
    const conn = connection({
      repos: ['acme/api', 'acme/web', 'acme/infra'],
      selectedRepos: ['acme/web'],
    });

    const result = await collector.collect(conn, { token: 't', fetchImpl });

    expect(seen).toEqual(['acme/web']);
    expect(result.repos?.map((r) => r.repo)).toEqual(['acme/web']);
  });

  it('falls back to all discovered repos when no selection is set', async () => {
    const { fetchImpl, seen } = fakeGithubFetch();
    const collector = new GithubCollector();
    const conn = connection({ repos: ['acme/api', 'acme/web'] });

    await collector.collect(conn, { token: 't', fetchImpl });

    expect(seen.sort()).toEqual(['acme/api', 'acme/web']);
  });
});
