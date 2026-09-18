import { describe, it, expect, beforeEach } from 'vitest';
import { PreviewService } from './preview.module';
import type { GithubCollector } from '../scanner/collectors/github.collector';
import type { RepoSignals } from '@riscly/shared';

/** A repo signal rich enough to produce a graph, plus data that must NOT leak. */
const signals = (over: Partial<RepoSignals> = {}): RepoSignals => ({
  provider: 'github',
  repo: 'acme/app',
  dependencies: ['next', 'pg', 'stripe'],
  frameworks: ['nextjs'],
  ...over,
});

function makeService(collect: () => Promise<{ repos: RepoSignals[] }>) {
  let calls = 0;
  const collector = {
    collect: async () => {
      calls++;
      return collect();
    },
  } as unknown as GithubCollector;
  const service = new PreviewService(collector);
  return { service, calls: () => calls };
}

describe('PreviewService.scan', () => {
  let service: PreviewService;
  beforeEach(() => {
    service = makeService(async () => ({ repos: [signals()] })).service;
  });

  it('rejects anything that is not a public GitHub repo', async () => {
    await expect(service.scan('https://gitlab.com/a/b', '1.1.1.1')).rejects.toThrow(
      /public GitHub repository/i,
    );
    await expect(service.scan('../../etc/passwd', '1.1.1.1')).rejects.toThrow();
    await expect(service.scan(undefined, '1.1.1.1')).rejects.toThrow();
  });

  it('returns the architecture for a valid repo', async () => {
    const r = await service.scan('acme/app', '1.1.1.1');
    expect(r.repo).toBe('acme/app');
    expect(r.graph.nodes.length).toBeGreaterThan(0);
    expect(r.detected).toContain('nextjs');
  });

  it('never leaks findings, code or dependency detail into an anonymous response', async () => {
    const { service: s } = makeService(async () => ({
      repos: [
        signals({
          codeFindings: [
            { category: 'security', severity: 'critical', title: 'Leaked key', description: 'secret!', weight: 20 },
          ],
          codeIssues: [
            { id: 'i1', file: 'src/a.ts', line: 3, rule: 'secret/x', severity: 'critical', title: 'k', description: 'd', snippet: 'sk_live_supersecret' },
          ],
          vulnerabilities: [
            { id: 'GHSA-1', package: 'lodash', version: '1.0.0', ecosystem: 'npm', severity: 'critical', summary: 's', repo: 'acme/app' },
          ],
          qualityHotspots: [
            { file: 'src/a.ts', loc: 500, complexity: 40, maxNesting: 6, todos: 3, score: 70, tags: ['large-file'] },
          ],
        }),
      ],
    }));
    const r = await s.scan('acme/app', '1.1.1.1');
    const serialized = JSON.stringify(r);

    expect(r.graph.codeFindings).toBeUndefined();
    expect(r.graph.codeIssues).toBeUndefined();
    expect(r.graph.vulnerabilities).toBeUndefined();
    expect(r.graph.qualityHotspots).toBeUndefined();
    expect(r.graph.components).toBeUndefined();
    expect(serialized).not.toContain('sk_live_supersecret');
    expect(serialized).not.toContain('Leaked key');
    expect(serialized).not.toContain('GHSA-1');
  });

  it('scores the posture it can derive from architecture alone', async () => {
    const r = await service.scan('acme/app', '1.1.1.1');
    expect(r.posture.score).not.toBeNull();
    expect(r.posture.total).toBeGreaterThan(0);
    expect(r.posture.total).toBe(
      r.posture.counts.critical +
        r.posture.counts.high +
        r.posture.counts.medium +
        r.posture.counts.low,
    );
    const scored = r.posture.dimensions.filter((d) => d.analyzed).map((d) => d.dimension);
    expect(scored).toContain('reliability');
    expect(scored).toContain('architecture');
  });

  it('leaves the dimensions it never measured unmeasured, and says why', async () => {
    const r = await service.scan('acme/app', '1.1.1.1');
    for (const key of ['ai_security', 'maintainability'] as const) {
      const d = r.posture.dimensions.find((x) => x.dimension === key)!;
      expect(d.analyzed).toBe(false);
      expect(d.score).toBeNull();
      // A tokenless scan never read the source, so it must not claim it looked.
      expect(d.note).toBe('Needs your repository');
    }
  });

  it('sends scores and counts but never a finding title', async () => {
    const r = await service.scan('acme/app', '1.1.1.1');
    const serialized = JSON.stringify(r.posture.dimensions);
    expect(serialized).not.toMatch(/single point of failure|backup|rate limit/i);
  });

  it('refuses a repository it could not read', async () => {
    const { service: s } = makeService(async () => ({ repos: [] }));
    await expect(s.scan('acme/app', '1.1.1.1')).rejects.toThrow(/exist and be public/i);
  });

  it('serves a repeat visit from cache without scanning again', async () => {
    const { service: s, calls } = makeService(async () => ({ repos: [signals()] }));
    await s.scan('acme/app', '1.1.1.1');
    await s.scan('https://github.com/acme/app', '2.2.2.2');
    expect(calls()).toBe(1);
  });

  it('caps how many distinct repos one client may scan', async () => {
    const { service: s } = makeService(async () => ({ repos: [signals()] }));
    const ip = '3.3.3.3';
    for (let i = 0; i < 8; i++) await s.scan(`acme/app-${i}`, ip);
    await expect(s.scan('acme/app-9', ip)).rejects.toThrow(/limit reached/i);
  });

  it('limits each client separately', async () => {
    const { service: s } = makeService(async () => ({ repos: [signals()] }));
    for (let i = 0; i < 8; i++) await s.scan(`acme/app-${i}`, '4.4.4.4');
    await expect(s.scan('acme/other', '5.5.5.5')).resolves.toBeTruthy();
  });

  it('does not spend quota on input it rejects', async () => {
    const { service: s } = makeService(async () => ({ repos: [signals()] }));
    const ip = '6.6.6.6';
    for (let i = 0; i < 20; i++) {
      await expect(s.scan('not a repo', ip)).rejects.toThrow();
    }
    await expect(s.scan('acme/app', ip)).resolves.toBeTruthy();
  });
});
