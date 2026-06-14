import { describe, it, expect } from 'vitest';
import { predictFailures } from './prediction';
import { exampleGraph } from './fixtures';
import { SystemGraph } from './model';

describe('prediction engine (heuristics)', () => {
  it('predicts the database bottleneck for the example system', () => {
    const preds = predictFailures(exampleGraph);
    const db = preds.find((p) => p.nodeId === 'db');
    expect(db).toBeDefined();
    expect(db!.category).toBe('bottleneck');
  });

  it('estimates a user horizon from requests/min and current users', () => {
    // API does 6000 rpm at 4000 users → 1.5 rpm/user.
    const preds = predictFailures(exampleGraph, { currentUsers: 4000 });
    const api = preds.find((p) => p.id.startsWith('pred-api-'));
    expect(api?.horizon).toMatch(/at ~[\d,]+ users/);
  });

  it('flags unmetered APIs as a future abuse risk', () => {
    const preds = predictFailures(exampleGraph);
    expect(preds.some((p) => p.id.startsWith('pred-ratelimit-'))).toBe(true);
  });

  it('predicts origin saturation when there is no CDN', () => {
    const preds = predictFailures(exampleGraph);
    expect(preds.some((p) => p.id === 'pred-no-cdn')).toBe(true);
  });

  it('does not predict a DB bottleneck when the DB is redundant', () => {
    const hardened: SystemGraph = {
      nodes: exampleGraph.nodes.map((n) =>
        n.id === 'db' ? { ...n, redundant: true } : n,
      ),
      edges: exampleGraph.edges,
    };
    const preds = predictFailures(hardened);
    expect(preds.find((p) => p.id === 'pred-db-db')).toBeUndefined();
  });

  it('is deterministic and sorted by likelihood', () => {
    const a = predictFailures(exampleGraph);
    const b = predictFailures(exampleGraph);
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) {
      expect(a[i - 1].likelihood).toBeGreaterThanOrEqual(a[i].likelihood);
    }
  });
});
