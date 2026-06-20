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

/**
 * A code-level issue located to a specific file and line range, so the code
 * view can show only the affected regions and an AI can propose a fix.
 */
export interface CodeIssue {
  id: string;
  /** Repo-relative path, e.g. "apps/api/src/config.ts". */
  file: string;
  /** Owner/name of the repo this issue belongs to. */
  repo?: string;
  /** 1-based start line of the offending region. */
  line: number;
  /** 1-based end line, when the region spans multiple lines. */
  endLine?: number;
  /** Stable rule id, e.g. "secret/stripe-live-key", "docker/root-user". */
  rule: string;
  severity: Severity;
  title: string;
  description: string;
  /** The offending source line(s), for display + AI context. */
  snippet?: string;
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
