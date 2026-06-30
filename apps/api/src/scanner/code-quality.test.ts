import { describe, it, expect } from 'vitest';
import { analyzeFileQuality, analyzeQuality } from './code-quality';

describe('analyzeFileQuality', () => {
  it('ignores tiny files and non-code files', () => {
    expect(analyzeFileQuality('a.ts', 'const x = 1\n')).toBeNull();
    expect(analyzeFileQuality('README.md', 'x\n'.repeat(50))).toBeNull();
    expect(analyzeFileQuality('data.json', '{}\n'.repeat(50))).toBeNull();
  });

  it('scores a large, complex, deeply-nested file as a hotspot', () => {
    const body = Array.from({ length: 500 }, (_, i) =>
      '            if (a && b || c) { for (const x of y) { while (z) { switch (q) { case 1: break } } } } // TODO fix',
    ).join('\n');
    const h = analyzeFileQuality('src/big.ts', body)!;
    expect(h).not.toBeNull();
    expect(h.loc).toBeGreaterThan(400);
    expect(h.complexity).toBeGreaterThan(60);
    expect(h.todos).toBeGreaterThan(0);
    expect(h.score).toBeGreaterThanOrEqual(70);
    expect(h.tags).toContain('large-file');
    expect(h.tags).toContain('high-complexity');
  });

  it('ranks and summarizes hotspots', () => {
    const simple = 'function f() {\n' + '  return 1\n'.repeat(20) + '}\n';
    const complex = Array.from({ length: 200 }, () => 'if (x && y) { for (;;) { while (z) {} } } // FIXME').join('\n');
    const { hotspots, summary } = analyzeQuality([
      { path: 'src/simple.ts', content: simple },
      { path: 'src/complex.ts', content: complex },
    ]);
    expect(hotspots[0].file).toBe('src/complex.ts'); // riskiest first
    expect(summary.filesAnalyzed).toBe(2);
    expect(summary.totalTodos).toBeGreaterThan(0);
  });
});
