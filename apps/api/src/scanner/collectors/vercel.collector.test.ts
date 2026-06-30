import { describe, it, expect, vi } from 'vitest';
import { VercelCollector } from './vercel.collector';
import type { CollectorContext } from './collector';
import type { ConnectionRecord } from '../../store/store.module';

const conn = (metadata: Record<string, unknown> = {}): ConnectionRecord =>
  ({ id: 'c1', provider: 'vercel', metadata } as unknown as ConnectionRecord);

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

const PROJECTS = {
  projects: [
    { id: 'p1', name: 'acme-web', link: { type: 'github', org: 'acme', repo: 'web' } },
    { id: 'p2', name: 'marketing-site', link: { type: 'github', org: 'acme', repo: 'marketing' } },
    { id: 'p3', name: 'unrelated', link: { type: 'github', org: 'other', repo: 'thing' } },
  ],
};

function fetchProjects() {
  return vi.fn(async (url: string) => {
    if (url.includes('/v9/projects') && !url.includes('/env')) return json(PROJECTS);
    return json({ envs: [] }); // env audit: nothing plaintext
  }) as unknown as typeof fetch;
}

describe('VercelCollector scoping', () => {
  it('narrows org-token projects to the ones linked to a connected repo', async () => {
    const fetchImpl = fetchProjects();
    const ctx: CollectorContext = { fetchImpl, token: 'org-token', repoHints: ['acme/web'] };

    const res = await new VercelCollector().collect(conn(), ctx);
    const names = (res.clouds?.[0]?.services ?? []).map((s) => s.name);

    expect(names).toEqual(['acme-web']); // only the linked project, not the others
  });

  it('falls back to all projects when no repo hint matches any link', async () => {
    const fetchImpl = fetchProjects();
    const ctx: CollectorContext = { fetchImpl, token: 'org-token', repoHints: ['nobody/nope'] };

    const res = await new VercelCollector().collect(conn(), ctx);
    const names = (res.clouds?.[0]?.services ?? []).map((s) => s.name);

    expect(names).toHaveLength(3); // no match → don't hide everything
  });

  it('honors an explicit selectedProjects list over repo hints', async () => {
    const fetchImpl = fetchProjects();
    const ctx: CollectorContext = { fetchImpl, token: 'org-token', repoHints: ['acme/web'] };

    const res = await new VercelCollector().collect(
      conn({ selectedProjects: ['marketing-site'] }),
      ctx,
    );
    const names = (res.clouds?.[0]?.services ?? []).map((s) => s.name);

    expect(names).toEqual(['marketing-site']);
  });
});
