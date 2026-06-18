import {
  Swords, ServerCrash, TrendingUp, type LucideIcon,
} from 'lucide-react';
import {
  simulateFailure, revenueImpact, attackSimulation, exampleGraph, exampleBusiness,
  type SimulationType, type SimulationParams, type AttackSimType, type Impact,
  type SystemGraph, type BusinessContext,
} from '@riscly/shared';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SimScenario {
  /** Stable url-safe id, e.g. "attack-ddos". */
  id: string;
  label: string;
  /** Failure / growth scenarios map to the failure engine. */
  sim?: { type: SimulationType; params?: SimulationParams; durationHours?: number };
  /** Attack scenarios map to the attack engine. */
  attack?: AttackSimType;
}

export interface SimGroup {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  scenarios: SimScenario[];
}

export const SIM_GROUPS: SimGroup[] = [
  {
    key: 'attack',
    title: 'Attack Simulation',
    description: 'Probe how a real attacker would reach your system — and what would contain them.',
    icon: Swords,
    scenarios: [
      { id: 'attack-ddos', label: 'DDoS', attack: 'ddos' },
      { id: 'attack-api_abuse', label: 'API Abuse', attack: 'api_abuse' },
      { id: 'attack-credential_leak', label: 'Credential Leak', attack: 'credential_leak' },
      { id: 'attack-github_token_leak', label: 'GitHub Token Leak', attack: 'github_token_leak' },
      { id: 'attack-jwt_secret_leak', label: 'JWT Secret Leak', attack: 'jwt_secret_leak' },
    ],
  },
  {
    key: 'failure',
    title: 'Failure Simulation',
    description: 'Knock out a dependency and measure the blast radius and revenue at risk.',
    icon: ServerCrash,
    scenarios: [
      { id: 'failure-db', label: 'Database Failure', sim: { type: 'db_lock' } },
      { id: 'failure-redis', label: 'Redis Failure', sim: { type: 'cache' } },
      { id: 'failure-stripe', label: 'Stripe Outage', sim: { type: 'stripe_down' } },
      { id: 'failure-dns', label: 'DNS Failure', sim: { type: 'dns' } },
      { id: 'failure-cloud', label: 'Cloud Outage', sim: { type: 'aws_down' } },
    ],
  },
  {
    key: 'growth',
    title: 'Growth Simulation',
    description: 'Stress the system with traffic surges to find the scaling cliffs before customers do.',
    icon: TrendingUp,
    scenarios: [
      { id: 'growth-10x', label: '10x Traffic', sim: { type: 'traffic_10x' } },
      { id: 'growth-100x', label: '100x Traffic', sim: { type: 'traffic_100x' } },
      { id: 'growth-bf', label: 'Black Friday', sim: { type: 'traffic_100x', params: { multiplier: 50 }, durationHours: 8 } },
      { id: 'growth-viral', label: 'Viral Growth', sim: { type: 'viral_peak' } },
    ],
  },
];

const IMPACT_SEVERITY: Record<Impact, Severity> = {
  none: 'low',
  degraded: 'medium',
  partial_outage: 'high',
  full_outage: 'critical',
};

const IMPACT_LABEL: Record<Impact, string> = {
  none: 'No impact',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  full_outage: 'Full outage',
};

export interface SimView {
  id: string;
  groupKey: string;
  groupTitle: string;
  title: string;
  status: string;
  statusGood: boolean;
  severity: Severity;
  blastRadius: number;
  affectedIds: string[];
  /** The node(s) where the scenario originates (epicenter), if known. */
  epicenterIds: string[];
  vector?: string;
  narrative: string;
  bullets: string[];
  revenue?: string;
}

export function findScenario(id: string): { group: SimGroup; scenario: SimScenario } | undefined {
  for (const group of SIM_GROUPS) {
    const scenario = group.scenarios.find((s) => s.id === id);
    if (scenario) return { group, scenario };
  }
  return undefined;
}

function money(n: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Run a scenario by id against the given system model + business context,
 * producing a display view. Pass the active project's graph/business so the
 * simulation reflects real data (falls back to the demo fixtures).
 */
export function runScenarioById(
  id: string,
  graph: SystemGraph = exampleGraph,
  business: BusinessContext = exampleBusiness,
): SimView | null {
  const found = findScenario(id);
  if (!found) return null;
  const { group, scenario } = found;

  if (scenario.attack) {
    const r = attackSimulation(graph, scenario.attack);
    // The epicenter for an attack is the public entrypoint(s) it enters through.
    const epicenterIds = graph.nodes
      .filter((n) => n.kind === 'frontend' || n.kind === 'api' || n.kind === 'cdn' || n.kind === 'dns')
      .map((n) => n.id)
      .filter((nid) => r.affectedNodeIds.includes(nid));
    return {
      id, groupKey: group.key, groupTitle: group.title, title: scenario.label,
      status: r.exposed ? 'Exposed' : 'Protected',
      statusGood: !r.exposed,
      severity: r.severity,
      blastRadius: r.blastRadius,
      affectedIds: r.affectedNodeIds,
      epicenterIds: epicenterIds.length ? epicenterIds : r.affectedNodeIds.slice(0, 1),
      vector: r.vector,
      narrative: r.summary,
      bullets: r.mitigations,
    };
  }

  const { type, params, durationHours } = scenario.sim!;
  const result = simulateFailure(graph, type, params);
  const rev = revenueImpact(result, business, durationHours ?? 1);
  return {
    id, groupKey: group.key, groupTitle: group.title, title: scenario.label,
    status: IMPACT_LABEL[result.impact],
    statusGood: result.impact === 'none',
    severity: IMPACT_SEVERITY[result.impact],
    blastRadius: result.blastRadius,
    affectedIds: result.affectedNodeIds,
    epicenterIds: result.affectedNodeIds.slice(0, 1),
    narrative: result.narrative,
    bullets: result.mitigations,
    revenue: money(rev.totalImpact, business.currency ?? 'EUR'),
  };
}

export { exampleGraph };
