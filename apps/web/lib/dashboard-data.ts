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
  SimulationType,
} from '@failsafe/shared';

const rel = reliabilityScore(exampleGraph);
const sec = securitySimulation(exampleGraph);
const recs = buildRecommendations(rel.findings);
const preds = predictFailures(exampleGraph, { currentUsers: exampleBusiness.activeUsers });

const currency = exampleBusiness.currency ?? 'EUR';
export function money(n: number) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function grade(score: number) {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
}
function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const reliability = {
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

export const security = { score: sec.score, exposures: sec.exposures };

export const stats = [
  { label: 'Reliability', value: String(rel.score), unit: '/100', tone: rel.score >= 75 ? 'good' : 'warn' as const },
  { label: 'Security', value: String(sec.score), unit: '/100', tone: sec.score >= 75 ? 'good' : 'warn' as const },
  { label: 'Open risks', value: String(rel.findings.length + sec.findings.length), unit: 'findings', tone: 'warn' as const },
  { label: 'SPOFs', value: String(rel.summary.spofCount), unit: 'critical', tone: 'bad' as const },
];

export const aiInsights = preds.slice(0, 4).map((p) => ({
  title: p.title,
  impact: p.severity.toUpperCase(),
  detail: `${p.rationale} ${p.recommendation}`,
  confidence: Math.round(p.likelihood * 100),
  horizon: p.horizon,
}));

export const vulnerabilities = [
  ...rel.findings.map((f) => ({ title: f.title, severity: f.severity, location: f.nodeId ?? 'system', kind: 'reliability' as const })),
  ...sec.findings.map((f) => ({ title: f.title, severity: f.severity, location: f.nodeId ?? 'edge', kind: 'security' as const })),
].slice(0, 7);

const REV_SCENARIOS: { type: SimulationType; label: string; hours: number }[] = [
  { type: 'dns', label: 'Full outage (DNS)', hours: 2 },
  { type: 'db_lock', label: 'Database down', hours: 3 },
  { type: 'stripe_down', label: 'Stripe down', hours: 24 },
  { type: 'infra_region', label: 'Region failure', hours: 4 },
];
export const revenue = REV_SCENARIOS.map((s) => {
  const r = revenueImpact(simulateFailure(exampleGraph, s.type), exampleBusiness, s.hours);
  return { label: s.label, hours: s.hours, amount: r.totalImpact };
}).sort((a, b) => b.amount - a.amount);
export const worstRevenue = revenue[0]?.amount ?? 0;

export const scenarios = [
  { name: 'AWS us-east-1 fails during a viral peak', steps: ['aws_down', 'traffic_100x'] as SimulationType[] },
  { name: 'Stripe offline for 24h', steps: ['stripe_down'] as SimulationType[] },
  { name: 'DB lock during a churn wave', steps: ['db_lock', 'churn_wave'] as SimulationType[] },
].map((s) => {
  const result = runScenario(exampleGraph, { steps: s.steps.map((type) => ({ type })) }, exampleBusiness);
  return { name: s.name, worstImpact: result.worstImpact, loss: result.totalRevenueImpact, steps: s.steps.length };
});

export const recommendations = recs.slice(0, 4);
export const systemGraph = exampleGraph;
export const topFindings = rel.findings;
