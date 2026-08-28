import { describe, it, expect } from 'vitest';
import {
  analyzeChange,
  analyzeChanges,
  addedDependencies,
  changeRiskFromScore,
  worstChangeRisk,
  type ChangeInput,
} from './change';
import { exampleGraph } from './fixtures';

const commit = (over: Partial<ChangeInput> = {}): ChangeInput => ({
  sha: 'abc1234',
  message: 'chore: tidy up',
  author: 'dev',
  repo: 'acme/app',
  date: '2026-01-01T10:00:00.000Z',
  files: [],
  ...over,
});

describe('analyzeChange', () => {
  it('treats a docs-only commit as low risk with no signals', () => {
    const a = analyzeChange(
      commit({ files: [{ path: 'README.md', additions: 3, deletions: 1 }] }),
      exampleGraph,
    );
    expect(a.risk).toBe('low');
    expect(a.signals).toHaveLength(0);
    expect(a.summary).toContain('Routine change');
  });

  it('flags authentication changes and points at the API nodes', () => {
    const a = analyzeChange(
      commit({ files: [{ path: 'apps/api/src/auth/session.ts', additions: 40, deletions: 10 }] }),
      exampleGraph,
    );
    expect(a.signals.some((s) => s.kind === 'security')).toBe(true);
    expect(a.touchedNodes).toContain('api');
  });

  it('escalates a committed credential file to a critical signal', () => {
    const a = analyzeChange(commit({ files: [{ path: 'apps/api/.env.production' }] }), exampleGraph);
    const sec = a.signals.find((s) => s.kind === 'security');
    expect(sec?.severity).toBe('critical');
    expect(a.risk === 'high' || a.risk === 'critical').toBe(true);
  });

  it('does not flag committed .env templates', () => {
    const a = analyzeChange(commit({ files: [{ path: '.env.example' }] }), exampleGraph);
    expect(a.signals.some((s) => s.kind === 'security')).toBe(false);
  });

  it('detects irreversible migrations from the patch and blames the database', () => {
    const a = analyzeChange(
      commit({
        files: [
          {
            path: 'prisma/migrations/20260101_drop/migration.sql',
            patch: '+++ b/migration.sql\n+DROP TABLE "Invoice";',
          },
        ],
      }),
      exampleGraph,
    );
    expect(a.signals.some((s) => s.title.includes('Irreversible'))).toBe(true);
    expect(a.touchedNodes).toContain('db');
  });

  it('adds compound risk when one commit touches auth and the revenue path', () => {
    const both = analyzeChange(
      commit({
        files: [{ path: 'src/auth/guard.ts' }, { path: 'src/billing/checkout.ts' }],
      }),
      exampleGraph,
    );
    const authOnly = analyzeChange(commit({ files: [{ path: 'src/auth/guard.ts' }] }), exampleGraph);
    const payOnly = analyzeChange(commit({ files: [{ path: 'src/billing/checkout.ts' }] }), exampleGraph);
    expect(both.score).toBeGreaterThan(authOnly.score + payOnly.score - 20);
    expect(both.touchedNodes).toContain('stripe');
  });

  it('works without a graph (no architecture scanned yet)', () => {
    const a = analyzeChange(commit({ files: [{ path: 'src/auth/session.ts' }] }));
    expect(a.signals.length).toBeGreaterThan(0);
    expect(a.touchedNodes).toEqual([]);
  });

  it('never scores above 100', () => {
    const a = analyzeChange(
      commit({
        files: [
          { path: '.env' },
          { path: 'src/auth/session.ts' },
          { path: 'Dockerfile' },
          { path: 'src/billing/checkout.ts' },
          { path: 'prisma/schema.prisma' },
          { path: 'package.json', additions: 4000, deletions: 3000 },
        ],
      }),
      exampleGraph,
    );
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.risk).toBe('critical');
  });
});

describe('addedDependencies', () => {
  it('reads new packages out of a package.json hunk', () => {
    const deps = addedDependencies([
      {
        path: 'package.json',
        patch: '--- a/package.json\n+++ b/package.json\n   "dependencies": {\n+    "ioredis": "^5.3.2",\n     "next": "16.0.0"',
      },
    ]);
    expect(deps).toEqual(['ioredis']);
  });

  it('ignores manifest metadata keys and non-manifest files', () => {
    expect(
      addedDependencies([{ path: 'package.json', patch: '+  "version": "1.2.0",' }]),
    ).toEqual([]);
    expect(addedDependencies([{ path: 'src/a.ts', patch: '+ "redis": "^4.0.0"' }])).toEqual([]);
  });

  it('reads requirements.txt pins', () => {
    expect(
      addedDependencies([{ path: 'requirements.txt', patch: '+redis==4.6.0' }]),
    ).toEqual(['redis']);
  });
});

describe('changeRiskFromScore / worstChangeRisk', () => {
  it('maps scores onto bands', () => {
    expect(changeRiskFromScore(0)).toBe('low');
    expect(changeRiskFromScore(25)).toBe('medium');
    expect(changeRiskFromScore(50)).toBe('high');
    expect(changeRiskFromScore(90)).toBe('critical');
  });

  it('reports the worst risk in a batch, or null when empty', () => {
    expect(worstChangeRisk([])).toBeNull();
    const list = analyzeChanges(
      [commit({ files: [{ path: 'README.md' }] }), commit({ sha: 'b', files: [{ path: '.env' }] })],
      exampleGraph,
    );
    expect(worstChangeRisk(list)).toBe('high');
  });

  it('sorts a batch newest first', () => {
    const list = analyzeChanges([
      commit({ sha: 'old', date: '2026-01-01T00:00:00.000Z' }),
      commit({ sha: 'new', date: '2026-02-01T00:00:00.000Z' }),
    ]);
    expect(list.map((c) => c.sha)).toEqual(['new', 'old']);
  });
});
