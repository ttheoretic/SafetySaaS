import { describe, it, expect } from 'vitest';
import {
  riskPosture,
  dimensionFor,
  weakest,
  findingsForDimension,
  bandFor,
  hasAiSurface,
} from './posture';
import { exampleGraph } from './fixtures';
import type { Finding } from './findings';
import type { SystemGraph } from './model';

const f = (over: Partial<Finding> = {}): Finding => ({
  category: 'security',
  severity: 'high',
  title: 'Finding',
  description: '...',
  weight: 14,
  ...over,
});

const quality = { filesAnalyzed: 30, avgScore: 28, hotspotCount: 4, totalTodos: 9 };

describe('dimensionFor', () => {
  it('rolls every category into exactly one dimension', () => {
    expect(dimensionFor('security')).toBe('security');
    expect(dimensionFor('ai_security')).toBe('ai_security');
    expect(dimensionFor('spof')).toBe('reliability');
    expect(dimensionFor('backup')).toBe('reliability');
    expect(dimensionFor('vendor_lock_in')).toBe('architecture');
    expect(dimensionFor('quality')).toBe('maintainability');
  });
});

describe('riskPosture', () => {
  it('reports nothing scored before the first scan', () => {
    const p = riskPosture({ findings: [], analyzed: false });
    expect(p.score).toBeNull();
    expect(p.dimensions.every((d) => !d.analyzed)).toBe(true);
    expect(p.headline).toContain('first scan');
  });

  it('scores a clean scanned system as low risk', () => {
    const p = riskPosture({ findings: [], graph: exampleGraph, quality, analyzed: true });
    expect(p.score).not.toBeNull();
    expect(p.score!).toBeGreaterThan(85);
    expect(p.band).toBe('low');
  });

  it('leaves AI security unmeasured when there is no AI surface', () => {
    const p = riskPosture({ findings: [], graph: exampleGraph, quality });
    const ai = p.dimensions.find((d) => d.dimension === 'ai_security')!;
    expect(ai.analyzed).toBe(false);
    expect(ai.score).toBeNull();
    expect(ai.note).toContain('No AI components');
  });

  it('scores AI security once AI components exist', () => {
    const graph: SystemGraph = {
      ...exampleGraph,
      nodes: [
        ...exampleGraph.nodes,
        { id: 'llm', kind: 'ai_model', name: 'Claude', provider: 'anthropic' },
      ],
    };
    const p = riskPosture({ findings: [], graph, quality });
    const ai = p.dimensions.find((d) => d.dimension === 'ai_security')!;
    expect(ai.analyzed).toBe(true);
    expect(ai.score).toBe(100);
  });

  it('leaves maintainability unmeasured until code is analysed', () => {
    const p = riskPosture({ findings: [], graph: exampleGraph });
    const m = p.dimensions.find((d) => d.dimension === 'maintainability')!;
    expect(m.analyzed).toBe(false);
    expect(m.note).toContain('No code analysed');
  });

  it('derives maintainability from the code-health summary', () => {
    const p = riskPosture({ findings: [], graph: exampleGraph, quality });
    const m = p.dimensions.find((d) => d.dimension === 'maintainability')!;
    expect(m.score).toBe(72); // 100 - avgScore 28
  });

  it('attributes findings to the right dimension only', () => {
    const p = riskPosture({
      findings: [f({ category: 'security' }), f({ category: 'spof' }), f({ category: 'spof' })],
      graph: exampleGraph,
      quality,
    });
    const sec = p.dimensions.find((d) => d.dimension === 'security')!;
    const rel = p.dimensions.find((d) => d.dimension === 'reliability')!;
    expect(sec.findings).toBe(1);
    expect(rel.findings).toBe(2);
    expect(rel.score!).toBeLessThan(sec.score!);
  });

  it('counts findings by severity', () => {
    const p = riskPosture({
      findings: [f({ severity: 'critical' }), f({ severity: 'low' }), f({ severity: 'low' })],
      graph: exampleGraph,
    });
    expect(p.counts).toMatchObject({ critical: 1, low: 2, high: 0, medium: 0 });
    expect(p.total).toBe(3);
  });

  it('names the weakest dimension in the headline', () => {
    const p = riskPosture({
      findings: [f({ category: 'spof', weight: 22 }), f({ category: 'backup', weight: 18 })],
      graph: exampleGraph,
      quality,
    });
    expect(weakest(p.dimensions)!.dimension).toBe('reliability');
    expect(p.headline.toLowerCase()).toContain('reliability');
  });

  it('weighs heavily but saturates, so a tail of findings cannot zero a dimension', () => {
    const many = Array.from({ length: 40 }, () => f({ severity: 'low', weight: 3 }));
    const p = riskPosture({ findings: many, graph: exampleGraph });
    const sec = p.dimensions.find((d) => d.dimension === 'security')!;
    expect(sec.score!).toBeGreaterThan(0);
    expect(sec.score!).toBeLessThan(50);
  });

  it('weighs a heuristic finding less than a verified one', () => {
    const verified = riskPosture({ findings: [f({ confidence: 'verified' })], graph: exampleGraph });
    const guess = riskPosture({ findings: [f({ confidence: 'heuristic' })], graph: exampleGraph });
    const s = (p: typeof verified) => p.dimensions.find((d) => d.dimension === 'security')!.score!;
    expect(s(guess)).toBeGreaterThan(s(verified));
  });
});

describe('bandFor', () => {
  const none = { critical: 0, high: 0, medium: 0, low: 0 };
  it('maps health onto a risk band', () => {
    expect(bandFor(90, none)).toBe('low');
    expect(bandFor(75, none)).toBe('medium');
    expect(bandFor(55, none)).toBe('high');
    expect(bandFor(30, none)).toBe('critical');
  });

  it('never reports low risk while a critical finding is open', () => {
    expect(bandFor(95, { ...none, critical: 1 })).toBe('high');
    expect(bandFor(40, { ...none, critical: 1 })).toBe('critical');
  });
});

describe('hasAiSurface / findingsForDimension', () => {
  it('detects AI nodes', () => {
    expect(hasAiSurface(exampleGraph)).toBe(false);
    expect(
      hasAiSurface({
        ...exampleGraph,
        nodes: [{ id: 'a', kind: 'ai_agent', name: 'Support agent' }],
      }),
    ).toBe(true);
  });

  it('returns a dimension’s findings worst-first', () => {
    const list = findingsForDimension(
      [f({ severity: 'low' }), f({ severity: 'critical' }), f({ category: 'spof' })],
      'security',
    );
    expect(list).toHaveLength(2);
    expect(list[0].severity).toBe('critical');
  });
});
