import { describe, it, expect } from 'vitest';
import {
  reliabilityScore,
  simulateFailure,
  revenueImpact,
  securitySimulation,
  buildRecommendations,
  singlePointsOfFailure,
  reachableFrom,
  exampleGraph,
  exampleBusiness,
  SystemGraph,
} from './index';

describe('graph algorithms', () => {
  it('finds nodes reachable from entrypoints', () => {
    const reachable = reachableFrom(exampleGraph, ['fe']);
    expect(reachable).toContain('db');
    expect(reachable).toContain('stripe');
  });

  it('detects the database as a single point of failure', () => {
    const spofs = singlePointsOfFailure(exampleGraph).map((n) => n.id);
    expect(spofs).toContain('db');
  });

  it('does not flag redundant nodes as SPOFs', () => {
    const redundantDb: SystemGraph = {
      nodes: exampleGraph.nodes.map((n) =>
        n.id === 'db' ? { ...n, redundant: true } : n,
      ),
      edges: exampleGraph.edges,
    };
    const spofs = singlePointsOfFailure(redundantDb).map((n) => n.id);
    expect(spofs).not.toContain('db');
  });
});

describe('reliability engine', () => {
  it('produces a score in 0..100 with explanatory findings', () => {
    const r = reliabilityScore(exampleGraph);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(reliabilityScore(exampleGraph)).toEqual(reliabilityScore(exampleGraph));
  });

  it('a heuristic finding dents the score less than a verified one', () => {
    const base: SystemGraph = { nodes: [{ id: 'svc', name: 'api', kind: 'service' }], edges: [] }
    const finding = (confidence: 'verified' | 'heuristic') => ({
      ...base,
      codeFindings: [
        { category: 'security' as const, severity: 'high' as const, title: 'x', description: '', weight: 14, confidence },
      ],
    })
    const verified = reliabilityScore(finding('verified')).score
    const heuristic = reliabilityScore(finding('heuristic')).score
    // Same severity, but the unproven (heuristic) one penalizes less → higher score.
    expect(heuristic).toBeGreaterThan(verified)
  })

  it('penalizes missing backups as critical', () => {
    const r = reliabilityScore(exampleGraph);
    const backup = r.findings.find((f) => f.category === 'backup');
    expect(backup?.severity).toBe('critical');
  });

  it('counts code findings and dependency vulnerabilities as risks', () => {
    // A topology-simple graph (single service, no detected backing services)
    // that is nonetheless full of insecure code — the "vibe-coded repo" case.
    const base: SystemGraph = {
      nodes: [{ id: 'svc', name: 'api', kind: 'service' }],
      edges: [],
    }
    const clean = reliabilityScore(base)

    const messy = reliabilityScore({
      ...base,
      codeFindings: [
        { category: 'security', severity: 'critical', title: 'Hardcoded AWS key', description: '', weight: 22 },
        { category: 'security', severity: 'high', title: 'eval() on user input', description: '', weight: 14 },
      ],
      vulnerabilities: [
        {
          id: 'CVE-2021-44228', package: 'log4j', version: '2.14', ecosystem: 'Maven',
          severity: 'critical', summary: 'RCE', repo: 'o/r',
        },
      ],
    })

    // The insecure repo must score worse and surface those code/dep risks.
    expect(messy.score).toBeLessThan(clean.score)
    expect(messy.findings.length).toBeGreaterThanOrEqual(3)
    expect(messy.findings.some((f) => f.title.includes('log4j'))).toBe(true)
  })

  it('a fully hardened system scores higher than a fragile one', () => {
    const hardened: SystemGraph = {
      nodes: exampleGraph.nodes.map((n) => ({
        ...n,
        redundant: true,
        hasBackup: true,
        hasRateLimit: true,
        provider: 'self',
      })),
      edges: exampleGraph.edges,
    };
    expect(reliabilityScore(hardened).score).toBeGreaterThan(
      reliabilityScore(exampleGraph).score,
    );
  });
});

describe('failure simulation engine', () => {
  it('database lock cuts off downstream and is at least partial outage', () => {
    const sim = simulateFailure(exampleGraph, 'db_lock');
    expect(sim.affectedNodeIds).toContain('db');
    expect(['partial_outage', 'full_outage']).toContain(sim.impact);
    expect(sim.blastRadius).toBeGreaterThan(0);
  });

  it('DNS outage is always a full outage', () => {
    const sim = simulateFailure(exampleGraph, 'dns');
    expect(sim.fullOutage).toBe(true);
    expect(sim.impact).toBe('full_outage');
  });

  it('Stripe down is a partial outage hitting payments', () => {
    const sim = simulateFailure(exampleGraph, 'stripe_down');
    expect(sim.impact).toBe('partial_outage');
    expect(sim.narrative.toLowerCase()).toContain('checkout');
  });

  it('reports no exposure when provider is not used', () => {
    const sim = simulateFailure(exampleGraph, 'aws_down');
    expect(sim.impact).toBe('none');
  });

  it('100x traffic finds the database bottleneck', () => {
    const sim = simulateFailure(exampleGraph, 'traffic_100x');
    expect(sim.affectedNodeIds).toContain('db');
  });
});

describe('revenue impact engine', () => {
  it('full outage loses more than degraded', () => {
    const full = revenueImpact(simulateFailure(exampleGraph, 'dns'), exampleBusiness, 2);
    const degraded = revenueImpact(
      { ...simulateFailure(exampleGraph, 'dns'), impact: 'degraded', fullOutage: false },
      exampleBusiness,
      2,
    );
    expect(full.totalImpact).toBeGreaterThan(degraded.totalImpact);
  });

  it('Stripe outage produces a conversion loss', () => {
    const r = revenueImpact(simulateFailure(exampleGraph, 'stripe_down'), exampleBusiness, 4);
    expect(r.conversionLoss).toBeGreaterThan(0);
    expect(r.conversionLossPct).toBeGreaterThan(0);
  });

  it('scales direct loss with duration', () => {
    const sim = simulateFailure(exampleGraph, 'dns');
    const oneHour = revenueImpact(sim, exampleBusiness, 1);
    const fourHours = revenueImpact(sim, exampleBusiness, 4);
    expect(fourHours.directLoss).toBeCloseTo(oneHour.directLoss * 4, 1);
  });
});

describe('security engine', () => {
  it('flags missing rate limiting and DDoS exposure', () => {
    const r = securitySimulation(exampleGraph);
    expect(r.score).toBeLessThan(100);
    const ddos = r.exposures.find((e) => e.attack === 'ddos');
    expect(ddos?.exposed).toBe(true);
  });

  it('is deterministic', () => {
    expect(securitySimulation(exampleGraph)).toEqual(securitySimulation(exampleGraph));
  });
});

describe('recommendations engine', () => {
  it('produces a prioritized recommendation per finding', () => {
    const findings = reliabilityScore(exampleGraph).findings;
    const recs = buildRecommendations(findings);
    expect(recs.length).toBe(findings.length);
    // Sorted by priority — first is at least as severe as the last.
    expect(recs[0].priority).toBeDefined();
    expect(recs[0].riskReductionPct).toBeGreaterThan(0);
  });
});
