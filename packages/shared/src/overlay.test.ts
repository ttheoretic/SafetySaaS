import { describe, it, expect } from 'vitest';
import { applyOverlay } from './overlay';
import { SystemGraph } from './model';

const base: SystemGraph = {
  nodes: [
    { id: 'api', kind: 'api', name: 'API' },
    { id: 'db', kind: 'database', name: 'Postgres' },
  ],
  edges: [{ from: 'api', to: 'db', criticality: 1 }],
  vulnerabilities: [
    { id: 'GHSA-x', package: 'p', version: '1', ecosystem: 'npm', severity: 'high', summary: 's', repo: 'r' },
  ],
};

describe('applyOverlay', () => {
  it('returns the base unchanged with no overlay', () => {
    expect(applyOverlay(base)).toBe(base);
  });

  it('removes a node and any edges touching it', () => {
    const g = applyOverlay(base, { removedNodeIds: ['db'] });
    expect(g.nodes.map((n) => n.id)).toEqual(['api']);
    expect(g.edges).toEqual([]);
  });

  it('adds a node and a connecting edge', () => {
    const g = applyOverlay(base, {
      addedNodes: [{ id: 'redis', kind: 'cache', name: 'Redis' }],
      addedEdges: [{ from: 'api', to: 'redis', criticality: 0.6 }],
    });
    expect(g.nodes.some((n) => n.id === 'redis')).toBe(true);
    expect(g.edges).toContainEqual({ from: 'api', to: 'redis', criticality: 0.6 });
  });

  it('applies per-node attribute overrides', () => {
    const g = applyOverlay(base, { nodeOverrides: { db: { hasBackup: true } } });
    expect(g.nodes.find((n) => n.id === 'db')?.hasBackup).toBe(true);
  });

  it('preserves code-analysis results (vulnerabilities) through the merge', () => {
    const g = applyOverlay(base, { removedNodeIds: ['db'] });
    expect(g.vulnerabilities).toEqual(base.vulnerabilities);
  });

  it('ignores an added edge whose endpoints are not present', () => {
    const g = applyOverlay(base, { addedEdges: [{ from: 'api', to: 'ghost' }] });
    expect(g.edges.some((e) => e.to === 'ghost')).toBe(false);
  });
});
