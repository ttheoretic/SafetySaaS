export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type FindingCategory =
  | 'spof'
  | 'database'
  | 'api'
  | 'backup'
  | 'rate_limit'
  | 'redundancy'
  | 'security'
  | 'vendor_lock_in';

export interface Finding {
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  nodeId?: string;
  /** Penalty contribution toward the reliability score (points, 0..100). */
  weight: number;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function severityFromWeight(weight: number): Severity {
  if (weight >= 20) return 'critical';
  if (weight >= 12) return 'high';
  if (weight >= 6) return 'medium';
  return 'low';
}
