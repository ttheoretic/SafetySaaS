import { describe, it, expect } from 'vitest';
import { buildSystemGraph } from './scan';
import { repoFragment } from './adapters';
import { mergeFragments } from './fragment';
import { reliabilityScore } from '../reliability';
import { ScanCollection, RepoSignals } from './signals';

const nextNestRepo: RepoSignals = {
  provider: 'github',
  repo: 'acme/app',
  frameworks: ['nextjs', 'nestjs'],
  hostProvider: 'vercel',
  dependencies: ['next', '@nestjs/core', 'prisma', 'pg', 'ioredis', 'stripe', 'bullmq'],
  envVars: ['DATABASE_URL', 'STRIPE_SECRET_KEY'],
};

describe('repo adapter', () => {
  it('infers frontend, api and backing services from dependencies', () => {
    const frag = repoFragment(nextNestRepo);
    const ids = frag.nodes.map((n) => n.id);
    expect(ids).toContain('app-frontend');
    expect(ids).toContain('app-api');
    expect(ids).toContain('postgres');
    expect(ids).toContain('redis');
    expect(ids).toContain('stripe');
    expect(ids).toContain('queue');
  });

  it('wires frontend -> api -> services with sensible criticality', () => {
    const frag = repoFragment(nextNestRepo);
    const fe = frag.edges.find((e) => e.from === 'app-frontend' && e.to === 'app-api');
    const db = frag.edges.find((e) => e.from === 'app-api' && e.to === 'postgres');
    expect(fe?.criticality).toBe(1);
    expect(db?.criticality).toBe(1);
  });

  it('detects rate limiting when a limiter dependency is present', () => {
    const frag = repoFragment({
      ...nextNestRepo,
      dependencies: [...nextNestRepo.dependencies, '@nestjs/throttler'],
    });
    const api = frag.nodes.find((n) => n.id === 'app-api');
    expect(api?.hasRateLimit).toBe(true);
  });

  it('leaves rate limiting unknown (not false) when no signal', () => {
    const api = repoFragment(nextNestRepo).nodes.find((n) => n.id === 'app-api');
    expect(api?.hasRateLimit).toBeUndefined();
  });
});

describe('fragment merge', () => {
  it('dedupes nodes and keeps the highest edge criticality', () => {
    const merged = mergeFragments([
      { nodes: [{ id: 'db', kind: 'database', name: 'DB', redundant: true }], edges: [{ from: 'a', to: 'db', criticality: 0.5 }] },
      { nodes: [{ id: 'db', kind: 'database', name: 'DB', redundant: false }, { id: 'a', kind: 'api', name: 'API' }], edges: [{ from: 'a', to: 'db', criticality: 0.9 }] },
    ]);
    expect(merged.nodes.filter((n) => n.id === 'db')).toHaveLength(1);
    // Less-safe value wins on merge: redundant true AND false => false.
    expect(merged.nodes.find((n) => n.id === 'db')?.redundant).toBe(false);
    expect(merged.edges.find((e) => e.to === 'db')?.criticality).toBe(0.9);
  });

  it('drops edges referencing unknown nodes', () => {
    const merged = mergeFragments([
      { nodes: [{ id: 'a', kind: 'api', name: 'A' }], edges: [{ from: 'a', to: 'ghost' }] },
    ]);
    expect(merged.edges).toHaveLength(0);
  });
});

describe('buildSystemGraph (end to end)', () => {
  const collection: ScanCollection = {
    repos: [nextNestRepo],
    databases: [{ provider: 'neon', name: 'Primary Postgres', region: 'eu-central-1', redundant: false, hasBackup: false }],
    billing: [{ provider: 'stripe', live: true }],
  };

  it('produces a connected, analyzable graph', () => {
    const graph = buildSystemGraph(collection);
    expect(graph.nodes.length).toBeGreaterThan(3);
    // The standalone Neon DB from the database adapter gets connected.
    const neon = graph.nodes.find((n) => n.provider === 'neon');
    expect(neon).toBeDefined();
    const neonEdge = graph.edges.find((e) => e.to === neon!.id);
    expect(neonEdge).toBeDefined();
  });

  it('feeds straight into the reliability engine', () => {
    const graph = buildSystemGraph(collection);
    const result = reliabilityScore(graph);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // A non-redundant Postgres with no backup must surface as a risk.
    expect(result.findings.some((f) => f.category === 'backup' || f.category === 'spof')).toBe(true);
  });

  it('is deterministic', () => {
    expect(buildSystemGraph(collection)).toEqual(buildSystemGraph(collection));
  });

  it('merges an inferred service into the connected provider (no duplicate)', () => {
    // A repo that uses Supabase (inferred DB) AND a connected Supabase collector.
    const repo: RepoSignals = {
      provider: 'github',
      repo: 'acme/app',
      dependencies: ['@supabase/supabase-js', 'next'],
      frameworks: ['nextjs'],
    } as RepoSignals;
    const graph = buildSystemGraph({
      repos: [repo],
      databases: [{ provider: 'supabase', name: 'acme-db', hasBackup: true }],
    });
    const supabases = graph.nodes.filter((n) => n.provider === 'supabase' && n.kind === 'database');
    expect(supabases).toHaveLength(1); // not two
    // The surviving (verified) node is connected, not floating.
    const id = supabases[0].id;
    expect(graph.edges.some((e) => e.to === id)).toBe(true);
    // No estimated supabase node remains.
    expect(graph.nodes.some((n) => n.id === 'supabase-db')).toBe(false);
  });

  it('merges an inferred Vercel frontend into the connected Vercel project', () => {
    const repo: RepoSignals = {
      provider: 'github',
      repo: 'acme/web',
      dependencies: ['next'],
      frameworks: ['nextjs'],
      hostProvider: 'vercel',
    } as RepoSignals;
    const graph = buildSystemGraph({
      repos: [repo],
      clouds: [{ provider: 'vercel', regions: ['global'], services: [{ id: 'vercel-web', name: 'web', kind: 'frontend', redundant: true }] }],
    });
    const frontends = graph.nodes.filter((n) => n.kind === 'frontend');
    expect(frontends).toHaveLength(1); // merged, not duplicated
  });
});
