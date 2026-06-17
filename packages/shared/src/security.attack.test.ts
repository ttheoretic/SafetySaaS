import { describe, it, expect } from 'vitest';
import { attackSimulation, ATTACK_SIMULATIONS } from './security';
import { exampleGraph } from './fixtures';

describe('attackSimulation', () => {
  it('produces a well-formed result for every attack type', () => {
    for (const { type } of ATTACK_SIMULATIONS) {
      const r = attackSimulation(exampleGraph, type);
      expect(r.attack).toBe(type);
      expect(r.blastRadius).toBeGreaterThanOrEqual(0);
      expect(r.blastRadius).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.affectedNodeIds)).toBe(true);
      expect(r.mitigations.length).toBeGreaterThan(0);
      expect(r.vector.length).toBeGreaterThan(0);
    }
  });

  it('treats secret-leak attacks as critical, system-wide exposure', () => {
    const gh = attackSimulation(exampleGraph, 'github_token_leak');
    expect(gh.severity).toBe('critical');
    expect(gh.exposed).toBe(true);
  });
});
