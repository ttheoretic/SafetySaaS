import { describe, it, expect } from 'vitest';
import { referencesFor, KNOWLEDGE } from './knowledge';
import { buildRecommendations } from './recommendations';
import { reliabilityScore } from './reliability';
import { exampleGraph } from './fixtures';
import { FindingCategory } from './findings';

describe('knowledge base (grounded recommendations)', () => {
  it('returns curated references for each finding category', () => {
    const categories = Object.keys(KNOWLEDGE) as FindingCategory[];
    for (const c of categories) {
      const refs = referencesFor(c);
      expect(refs.length).toBeGreaterThan(0);
      for (const r of refs) {
        expect(r.url).toMatch(/^https?:\/\//);
        expect(r.source).toBeTruthy();
      }
    }
  });

  it('attaches references to every recommendation', () => {
    const recs = buildRecommendations(reliabilityScore(exampleGraph).findings);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(Array.isArray(r.references)).toBe(true);
      expect(r.references.length).toBeGreaterThan(0);
    }
  });

  it('cites OWASP for rate-limit findings', () => {
    const refs = referencesFor('rate_limit');
    expect(refs.some((r) => r.source.includes('OWASP'))).toBe(true);
  });
});
