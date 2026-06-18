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

/** A fetch serving specific repo files (by contents path) and 404 otherwise. */
function fileServer(files: Record<string, string>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const m = String(url).match(/\/contents\/(.+)$/);
    const path = m ? decodeURIComponent(m[1]).replace(/\?.*$/, '') : '';
    if (init?.method === 'HEAD') return { ok: path in files } as Response;
    const content = files[path];
    if (content === undefined) return { ok: false, status: 404 } as Response;
    return {
      ok: true, status: 200,
      json: async () => ({ content: Buffer.from(content).toString('base64'), encoding: 'base64' }),
    } as Response;
  }) as unknown as typeof fetch;
}

describe('GithubCollector multi-language detection', () => {
  it('detects a Python repo (no package.json) with frameworks + env vars', async () => {
    const fetchImpl = fileServer({
      'requirements.txt': 'fastapi==0.110.0\nstripe==8.0.0\n# comment\n',
      '.env.example': 'DATABASE_URL=\nSTRIPE_SECRET_KEY=\n',
    });
    const collector = new GithubCollector();
    const conn = connection({ repos: ['acme/py'], selectedRepos: ['acme/py'] });

    const { repos } = await collector.collect(conn, { token: 't', fetchImpl });
    const sig = repos?.[0];
    expect(sig?.frameworks).toContain('fastapi');
    expect(sig?.dependencies).toContain('stripe');
    expect(sig?.envVars).toEqual(expect.arrayContaining(['DATABASE_URL', 'STRIPE_SECRET_KEY']));
  });
});

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
