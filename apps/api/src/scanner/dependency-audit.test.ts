import { describe, it, expect, vi } from 'vitest';
import { parseNpmLock, parseRequirements, auditResolvedDeps } from './dependency-audit';

describe('lockfile parsing', () => {
  it('parses resolved versions from an npm v3 lockfile', () => {
    const lock = JSON.stringify({
      packages: {
        '': { name: 'root' },
        'node_modules/lodash': { version: '4.17.20' },
        'node_modules/a/node_modules/lodash': { version: '4.17.21' },
      },
    });
    const deps = parseNpmLock(lock);
    expect(deps).toContainEqual({ name: 'lodash', version: '4.17.20', ecosystem: 'npm' });
    expect(deps).toContainEqual({ name: 'lodash', version: '4.17.21', ecosystem: 'npm' });
  });

  it('parses pinned PyPI requirements and ignores comments/flags', () => {
    const req = '# comment\n-r base.txt\nDjango==3.2.0\nrequests == 2.25.1\nflask>=1.0\n';
    expect(parseRequirements(req)).toEqual([
      { name: 'Django', version: '3.2.0', ecosystem: 'PyPI' },
      { name: 'requests', version: '2.25.1', ecosystem: 'PyPI' },
    ]);
  });
});

describe('auditResolvedDeps (mocked OSV)', () => {
  it('maps OSV advisories to dependency vulnerabilities with severity + fix', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/v1/querybatch')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [{ vulns: [{ id: 'GHSA-aaa' }] }, {}] }),
        } as Response;
      }
      if (String(url).includes('/v1/vulns/GHSA-aaa')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'GHSA-aaa',
            summary: 'Prototype pollution in lodash',
            database_specific: { severity: 'HIGH' },
            affected: [{ package: { name: 'lodash' }, ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.21' }] }] }],
            references: [{ url: 'https://example.com/advisory' }],
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    }) as unknown as typeof fetch;

    const vulns = await auditResolvedDeps(
      [
        { name: 'lodash', version: '4.17.20', ecosystem: 'npm' },
        { name: 'safe-pkg', version: '1.0.0', ecosystem: 'npm' },
      ],
      'acme/web',
      fetchImpl,
    );

    expect(vulns).toHaveLength(1);
    expect(vulns[0]).toMatchObject({
      id: 'GHSA-aaa',
      package: 'lodash',
      version: '4.17.20',
      severity: 'high',
      fixedVersion: '4.17.21',
      repo: 'acme/web',
    });
    expect(vulns[0].references).toContain('https://example.com/advisory');
  });

  it('returns nothing when OSV reports no vulnerabilities', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ results: [{}] }),
    } as Response)) as unknown as typeof fetch;

    const vulns = await auditResolvedDeps([{ name: 'x', version: '1.0.0', ecosystem: 'npm' }], 'acme/web', fetchImpl);
    expect(vulns).toEqual([]);
  });
});
