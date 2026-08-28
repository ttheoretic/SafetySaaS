import { describe, it, expect } from 'vitest';
import { releaseReadiness, type ReadinessInput } from './readiness';
import { analyzeChange } from './change';
import { exampleGraph } from './fixtures';
import type { Finding } from './findings';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const FRESH = '2026-03-01T09:00:00.000Z';

const finding = (over: Partial<Finding> = {}): Finding => ({
  category: 'security',
  severity: 'critical',
  title: 'Hardcoded Stripe live key',
  description: 'A live secret key is committed to the repository.',
  weight: 20,
  ...over,
});

const input = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  findings: [],
  graph: exampleGraph,
  changes: [],
  vulnerabilities: [],
  lastScanAt: FRESH,
  now: NOW,
  ...over,
});

describe('releaseReadiness', () => {
  it('asks for a scan when the project has never been analysed', () => {
    const r = releaseReadiness(input({ lastScanAt: undefined }));
    expect(r.verdict).toBe('review');
    expect(r.score).toBe(0);
    expect(r.warnings[0].area).toBe('coverage');
  });

  it('is READY when nothing is open and the scan is fresh', () => {
    const r = releaseReadiness(input());
    expect(r.verdict).toBe('ready');
    expect(r.score).toBe(100);
    expect(r.blockers).toHaveLength(0);
    expect(r.passed).toContain('No critical or high security findings open');
    expect(r.headline).toContain('Ready to ship');
  });

  it('BLOCKS on an open critical security finding and names it', () => {
    const r = releaseReadiness(input({ findings: [finding()] }));
    expect(r.verdict).toBe('blocked');
    expect(r.blockers[0].area).toBe('security');
    expect(r.blockers[0].detail).toContain('Hardcoded Stripe live key');
    expect(r.score).toBeLessThan(100);
  });

  it('only warns on high-severity security findings', () => {
    const r = releaseReadiness(input({ findings: [finding({ severity: 'high' })] }));
    expect(r.verdict).toBe('review');
    expect(r.blockers).toHaveLength(0);
    expect(r.warnings.some((w) => w.area === 'security')).toBe(true);
  });

  it('BLOCKS on a critical dependency advisory', () => {
    const r = releaseReadiness(
      input({
        vulnerabilities: [
          {
            id: 'GHSA-1',
            package: 'lodash',
            version: '4.17.20',
            ecosystem: 'npm',
            severity: 'critical',
            summary: 'Prototype pollution',
            fixedVersion: '4.17.21',
            repo: 'acme/app',
          },
        ],
      }),
    );
    expect(r.verdict).toBe('blocked');
    expect(r.blockers.some((b) => b.area === 'dependency')).toBe(true);
  });

  it('BLOCKS on a critical-risk change in the window', () => {
    const change = analyzeChange(
      {
        sha: 'a',
        message: 'wire up new billing flow',
        author: 'dev',
        repo: 'acme/app',
        date: '2026-03-01T11:00:00.000Z',
        files: [{ path: '.env.production' }, { path: 'src/auth/guard.ts' }, { path: 'src/billing/checkout.ts' }],
      },
      exampleGraph,
    );
    const r = releaseReadiness(input({ changes: [change] }));
    expect(change.risk).toBe('critical');
    expect(r.verdict).toBe('blocked');
    expect(r.blockers.some((b) => b.area === 'change')).toBe(true);
  });

  it('treats a missing backup as a blocker only when the release touches data', () => {
    const backupGap: Finding = finding({
      category: 'backup',
      severity: 'high',
      title: 'PostgreSQL has no automated backup',
    });
    const idle = releaseReadiness(input({ findings: [backupGap] }));
    expect(idle.verdict).toBe('review');
    expect(idle.warnings.some((w) => w.area === 'reliability')).toBe(true);

    const migration = analyzeChange(
      {
        sha: 'b',
        message: 'add orders table',
        author: 'dev',
        repo: 'acme/app',
        date: '2026-03-01T11:00:00.000Z',
        files: [{ path: 'prisma/migrations/20260301_orders/migration.sql' }],
      },
      exampleGraph,
    );
    const shipping = releaseReadiness(input({ findings: [backupGap], changes: [migration] }));
    expect(shipping.verdict).toBe('blocked');
    expect(shipping.blockers[0].title).toContain('no verified backup');
  });

  it('warns when the analysis is stale', () => {
    const r = releaseReadiness(input({ lastScanAt: '2026-02-01T09:00:00.000Z' }));
    expect(r.verdict).toBe('review');
    expect(r.warnings.some((w) => w.title.includes('Last scan was'))).toBe(true);
  });

  it('warns about dependencies added after the last scan ran', () => {
    const change = analyzeChange({
      sha: 'c',
      message: 'add redis client',
      author: 'dev',
      repo: 'acme/app',
      date: '2026-03-01T11:00:00.000Z',
      files: [{ path: 'package.json', patch: '+    "ioredis": "^5.3.2",' }],
    });
    const r = releaseReadiness(input({ changes: [change] }));
    expect(r.warnings.some((w) => w.title.includes('new dependency'))).toBe(true);
  });

  it('sorts blockers by severity and keeps the score bounded', () => {
    const r = releaseReadiness(
      input({
        findings: [finding(), finding({ category: 'backup', severity: 'high', title: 'no backup' })],
        vulnerabilities: Array.from({ length: 20 }, (_, i) => ({
          id: `GHSA-${i}`,
          package: 'p',
          version: '1',
          ecosystem: 'npm',
          severity: 'critical' as const,
          summary: 's',
          repo: 'acme/app',
        })),
      }),
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.blockers[0].severity).toBe('critical');
  });
});
