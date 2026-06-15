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
  const worstRevenue = revenue[0]?.amount ?? 0;

  // --- Business KPIs ---
  const allFindings = [...rel.findings, ...sec.findings];
  const criticalRisks = allFindings.filter((f) => f.severity === 'critical' || f.severity === 'high').length;
  const failureProbability = preds.length
    ? Math.round(Math.max(...preds.map((p) => p.likelihood)) * 100)
    : Math.round(100 - rel.score);
  const monthlyDowntimeCost = Math.round(worstRevenue * 2.5);

  const stats = [
    { label: 'Reliability', value: String(rel.score), unit: '/100', tone: rel.score >= 75 ? ('good' as const) : ('warn' as const) },
    { label: 'Revenue at risk', value: money(worstRevenue, currency), unit: 'worst event', tone: 'bad' as const },
    { label: 'Critical risks', value: String(criticalRisks), unit: 'high + critical', tone: 'bad' as const },
    { label: 'Failure probability', value: `${failureProbability}%`, unit: 'next bottleneck', tone: 'warn' as const },
    { label: 'Security', value: String(sec.score), unit: '/100', tone: sec.score >= 75 ? ('good' as const) : ('warn' as const) },
    { label: 'Downtime cost', value: money(monthlyDowntimeCost, currency), unit: '/mo est.', tone: 'bad' as const },
  ];

  // --- Risk Center: structured risks grouped by domain ---
  const SEV_FACTOR: Record<string, number> = { critical: 0.2, high: 0.1, medium: 0.04, low: 0.01 };
  const fin = (sev: string) => Math.round(business.monthlyRevenue * (SEV_FACTOR[sev] ?? 0.02));
  const relRecs = buildRecommendations(rel.findings);
  const secRecs = buildRecommendations(sec.findings);
  const recFor = (title: string) =>
    relRecs.find((r) => r.findingTitle === title) ?? secRecs.find((r) => r.findingTitle === title);

  type Risk = {
    group: 'Reliability' | 'Security' | 'Architecture' | 'Dependencies' | 'AI Forecast';
    title: string; severity: string; probability: number; financialImpact: number;
    fix: string; improvementPct: number; category: string; horizon?: string;
  };
  const fromFinding = (group: Risk['group'], f: typeof rel.findings[number]): Risk => {
    const rec = recFor(f.title);
    return {
      group, title: f.title, severity: f.severity,
      probability: rec?.probability ?? 0.3, financialImpact: fin(f.severity),
      fix: rec?.fix ?? '—', improvementPct: rec?.riskReductionPct ?? 0, category: f.category,
    };
  };
  const risks: Risk[] = [
    ...rel.findings
      .filter((f) => !['spof', 'redundancy', 'vendor_lock_in'].includes(f.category))
      .map((f) => fromFinding('Reliability', f)),
    ...sec.findings.map((f) => fromFinding('Security', f)),
    ...rel.findings.filter((f) => ['spof', 'redundancy'].includes(f.category)).map((f) => fromFinding('Architecture', f)),
    ...rel.findings.filter((f) => f.category === 'vendor_lock_in').map((f) => fromFinding('Dependencies', f)),
    ...preds.map((p): Risk => ({
      group: 'AI Forecast', title: p.title, severity: p.severity, probability: p.likelihood,
      financialImpact: fin(p.severity), fix: p.recommendation, improvementPct: 0,
      category: p.category, horizon: p.horizon,
    })),
  ];

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
    worstRevenue,
    monthlyDowntimeCost,
    criticalRisks,
    failureProbability,
    risks,
    scenarios,
    systemGraph: graph,
    topFindings: rel.findings,
    recommendations: recs.slice(0, 4),
  };
}

export const demoDashboard = computeDashboard(exampleGraph, exampleBusiness);
