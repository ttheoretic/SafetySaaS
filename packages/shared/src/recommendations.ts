/**
 * Recommendations Engine.
 *
 * Maps findings to prioritized, quantified, actionable recommendations. Each
 * recommendation carries a probability, business impact note, a concrete fix
 * and an estimated risk-reduction percentage.
 */

import { Finding, FindingCategory, SEVERITY_ORDER, Severity } from './findings';
import { KnowledgeRef, referencesFor } from './knowledge';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Recommendation {
  findingTitle: string;
  category: FindingCategory;
  title: string;
  description: string;
  priority: Priority;
  probability: number; // 0..1
  businessImpact: string;
  fix: string;
  riskReductionPct: number;
  nodeId?: string;
  /** Cited best-practice references grounding the recommendation. */
  references: KnowledgeRef[];
}

const PLAYBOOK: Record<
  FindingCategory,
  { fix: string; impact: string; reduction: number; probability: number }
> = {
  spof: {
    fix: 'Introduce redundancy: add a replica/second instance and automatic failover.',
    impact: 'Eliminates a total-outage path; protects revenue during component failure.',
    reduction: 37,
    probability: 0.4,
  },
  database: {
    fix: 'Add read replicas, connection pooling and automated failover.',
    impact: 'Prevents the database from becoming the outage and scaling bottleneck.',
    reduction: 40,
    probability: 0.5,
  },
  api: {
    fix: 'Run the API with multiple replicas behind a load balancer and add health checks.',
    impact: 'Removes an API-tier single point of failure on the critical request path.',
    reduction: 33,
    probability: 0.45,
  },
  backup: {
    fix: 'Enable automated backups with point-in-time recovery and test restores.',
    impact: 'Turns catastrophic data loss into a recoverable incident.',
    reduction: 60,
    probability: 0.2,
  },
  rate_limit: {
    fix: 'Add rate limiting (per-IP and per-key) at the edge / API gateway.',
    impact: 'Reduces abuse, accidental overload and brute-force exposure.',
    reduction: 25,
    probability: 0.6,
  },
  redundancy: {
    fix: 'Run the component clustered/replicated with persistence.',
    impact: 'Removes a single-instance failure that degrades the system.',
    reduction: 30,
    probability: 0.35,
  },
  security: {
    fix: 'Close the exposure: add auth, WAF/CDN and consistent throttling.',
    impact: 'Reduces breach likelihood and the blast radius of an attack.',
    reduction: 35,
    probability: 0.45,
  },
  vendor_lock_in: {
    fix: 'Abstract the dependency behind an interface and document a fallback.',
    impact: 'Limits exposure to third-party outages and pricing changes.',
    reduction: 15,
    probability: 0.3,
  },
};

const SEVERITY_TO_PRIORITY: Record<Severity, Priority> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export function buildRecommendations(findings: Finding[]): Recommendation[] {
  return findings
    .map((f) => {
      const play = PLAYBOOK[f.category];
      return {
        findingTitle: f.title,
        category: f.category,
        title: `Fix: ${f.title}`,
        description: f.description,
        priority: SEVERITY_TO_PRIORITY[f.severity],
        probability: play.probability,
        businessImpact: play.impact,
        fix: play.fix,
        riskReductionPct: play.reduction,
        nodeId: f.nodeId,
        references: referencesFor(f.category),
      };
    })
    .sort(
      (a, b) =>
        SEVERITY_ORDER[priorityToSeverity(b.priority)] -
          SEVERITY_ORDER[priorityToSeverity(a.priority)] ||
        b.riskReductionPct - a.riskReductionPct,
    );
}

function priorityToSeverity(p: Priority): Severity {
  return p as Severity;
}
