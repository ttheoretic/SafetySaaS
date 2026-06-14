import { describe, it, expect } from 'vitest';
import { runScenario } from './scenario';
import { exampleGraph, exampleBusiness } from './fixtures';

describe('scenario laboratory', () => {
  it('composes multiple simulations and aggregates impact', () => {
    const result = runScenario(
      exampleGraph,
      {
        steps: [
          { type: 'aws_down', durationHours: 2 },
          { type: 'traffic_100x' },
        ],
      },
      exampleBusiness,
    );
    expect(result.steps).toHaveLength(2);
    expect(result.totalRevenueImpact).toBeGreaterThanOrEqual(0);
  });

  it('reports the worst impact across steps', () => {
    const result = runScenario(exampleGraph, {
      steps: [
        { type: 'churn_wave' }, // degraded
        { type: 'dns' }, // full_outage
      ],
    });
    expect(result.worstImpact).toBe('full_outage');
  });

  it('sums revenue impact across steps', () => {
    const single = runScenario(
      exampleGraph,
      { steps: [{ type: 'dns', durationHours: 1 }] },
      exampleBusiness,
    );
    const doubled = runScenario(
      exampleGraph,
      { steps: [{ type: 'dns', durationHours: 1 }, { type: 'dns', durationHours: 1 }] },
      exampleBusiness,
    );
    expect(doubled.totalRevenueImpact).toBeCloseTo(single.totalRevenueImpact * 2, 1);
  });

  it('unions affected nodes across steps', () => {
    const result = runScenario(exampleGraph, {
      steps: [{ type: 'db_lock' }, { type: 'stripe_down' }],
    });
    expect(result.affectedNodeIds).toContain('db');
  });

  it('is deterministic', () => {
    const def = { steps: [{ type: 'dns' as const }, { type: 'traffic_10x' as const }] };
    expect(runScenario(exampleGraph, def, exampleBusiness)).toEqual(
      runScenario(exampleGraph, def, exampleBusiness),
    );
  });
});
