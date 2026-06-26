import { describe, it, expect, vi } from 'vitest';
import { GitlabCollector } from './gitlab.collector';
import type { CollectorContext } from './collector';
import type { ConnectionRecord } from '../../store/store.module';

const conn = (metadata: Record<string, unknown>): ConnectionRecord =>
  ({ id: 'c', provider: 'gitlab', metadata } as unknown as ConnectionRecord);

describe('GitlabCollector', () => {
  it('runs the shared SAST engine over a GitLab repo and finds an insecure pattern', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.endsWith('/projects/group%2Fapp')) {
        return { ok: true, status: 200, json: async () => ({ default_branch: 'main' }) } as unknown as Response;
      }
      if (u.includes('/repository/tree')) {
        // First page returns the file; further pages empty.
        if (u.includes('page=1')) {
          return {
            ok: true,
            status: 200,
            json: async () => [{ path: 'src/app.py', type: 'blob' }],
          } as unknown as Response;
        }
        return { ok: true, status: 200, json: async () => [] } as unknown as Response;
      }
      if (u.includes('/repository/files/')) {
        return {
          ok: true,
          status: 200,
          text: async () => 'import subprocess\nsubprocess.run(cmd, shell=True)\n',
        } as unknown as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    }) as unknown as typeof fetch;

    const ctx: CollectorContext = { fetchImpl, token: 'glpat-x' };
    const res = await new GitlabCollector().collect(
      conn({ selectedRepos: ['group/app'] }),
      ctx,
    );

    expect(res.repos).toHaveLength(1);
    const repo = res.repos![0];
    expect(repo.provider).toBe('gitlab');
    expect(repo.repo).toBe('group/app');
    const rules = (repo.codeIssues ?? []).map((i) => i.rule);
    expect(rules).toContain('py/shell-true');
  });

  it('returns nothing without a token', async () => {
    const res = await new GitlabCollector().collect(conn({ selectedRepos: ['g/a'] }), {
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(res.repos).toBeUndefined();
  });
});
