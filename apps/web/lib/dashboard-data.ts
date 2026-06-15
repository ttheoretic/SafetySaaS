import {
  reliabilityScore,
  securitySimulation,
  buildRecommendations,
  predictFailures,
  simulateFailure,
  revenueImpact,
  runScenario,
  exampleGraph,
  exampleBusiness,
  SystemGraph,
  BusinessContext,
  SimulationType,
} from '@failsafe/shared';

export function money(n: number, currency = exampleBusiness.currency ?? 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function grade(score: number) {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
}
function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type Dashboard = ReturnType<typeof computeDashboard>;

/** Compute every dashboard slice from a system graph — the single source the
 *  sections render from, so the demo graph and a real project graph are
 *  interchangeable. */
export function computeDashboard(graph: SystemGraph, business: BusinessContext = exampleBusiness) {
  const rel = reliabilityScore(graph);
  const sec = securitySimulation(graph);
  const recs = buildRecommendations(rel.findings);
  const preds = predictFailures(graph, { currentUsers: business.activeUsers });
  const currency = business.currency ?? 'EUR';

  const reliability = {
    score: rel.score,
    grade: grade(rel.score),
    delta: -6,
    uptimeForecast: (95 + rel.score * 0.049).toFixed(2),
    components: [
      { label: 'Redundancy', value: clamp(100 - rel.summary.spofCount * 22) },
      { label: 'Backups', value: rel.summary.databasesWithoutBackup ? 40 : 92 },
      { label: 'Rate limiting', value: rel.summary.apisWithoutRateLimit ? 35 : 90 },
      { label: 'Security posture', value: sec.score },
    ],
  };

  const stats = [
    { label: 'Reliability', value: String(rel.score), unit: '/100', tone: rel.score >= 75 ? ('good' as const) : ('warn' as const) },
    { label: 'Security', value: String(sec.score), unit: '/100', tone: sec.score >= 75 ? ('good' as const) : ('warn' as const) },
    { label: 'Open risks', value: String(rel.findings.length + sec.findings.length), unit: 'findings', tone: 'warn' as const },
    { label: 'SPOFs', value: String(rel.summary.spofCount), unit: 'critical', tone: 'bad' as const },
  ];

  const aiInsights = preds.slice(0, 4).map((p) => ({
    title: p.title,
    impact: p.severity.toUpperCase(),
    detail: `${p.rationale} ${p.recommendation}`,
    confidence: Math.round(p.likelihood * 100),
    horizon: p.horizon,
  }));

  const vulnerabilities = [
    ...rel.findings.map((f) => ({ title: f.title, severity: f.severity, location: f.nodeId ?? 'system', kind: 'reliability' as const })),
    ...sec.findings.map((f) => ({ title: f.title, severity: f.severity, location: f.nodeId ?? 'edge', kind: 'security' as const })),
  ].slice(0, 7);

  const revScenarios: { type: SimulationType; label: string; hours: number }[] = [
    { type: 'dns', label: 'Full outage (DNS)', hours: 2 },
    { type: 'db_lock', label: 'Database down', hours: 3 },
    { type: 'stripe_down', label: 'Stripe down', hours: 24 },
    { type: 'infra_region', label: 'Region failure', hours: 4 },
  ];
  const revenue = revScenarios
    .map((s) => ({ label: s.label, hours: s.hours, amount: revenueImpact(simulateFailure(graph, s.type), business, s.hours).totalImpact }))
    .sort((a, b) => b.amount - a.amount);

  const scenarios = [
    { name: 'AWS us-east-1 fails during a viral peak', steps: ['aws_down', 'traffic_100x'] as SimulationType[] },
    { name: 'Stripe offline for 24h', steps: ['stripe_down'] as SimulationType[] },
    { name: 'DB lock during a churn wave', steps: ['db_lock', 'churn_wave'] as SimulationType[] },
  ].map((s) => {
    const r = runScenario(graph, { steps: s.steps.map((type) => ({ type })) }, business);
    return { name: s.name, worstImpact: r.worstImpact, loss: r.totalRevenueImpact, steps: s.steps.length };
  });

  return {
    currency,
    reliability,
    security: { score: sec.score, exposures: sec.exposures },
    stats,
    aiInsights,
    vulnerabilities,
    revenue,
    worstRevenue: revenue[0]?.amount ?? 0,
    scenarios,
    systemGraph: graph,
    topFindings: rel.findings,
    recommendations: recs.slice(0, 4),
  };
}

export const demoDashboard = computeDashboard(exampleGraph, exampleBusiness);
