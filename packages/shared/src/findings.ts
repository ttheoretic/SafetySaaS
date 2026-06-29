export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * How trustworthy a finding is.
 *  - `verified`  : read from the live source of truth (cloud API, auth config).
 *  - `high`      : AST/structure-level static analysis (dataflow-aware).
 *  - `heuristic` : pattern/regex match — may include false positives.
 */
export type Confidence = 'verified' | 'high' | 'heuristic';

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
  /** Stable rule id, when the finding came from a located code issue. */
  rule?: string;
  /** Repo-relative file path, when the finding is located to source. */
  file?: string;
  /** 1-based line, when the finding is located to source. */
  line?: number;
  /** "owner/name" of the repo, when the finding is located to source. */
  repo?: string;
  /** How trustworthy this finding is (verified > high > heuristic). */
  confidence?: Confidence;
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
  /** How trustworthy this issue is (verified > high > heuristic). */
  confidence?: Confidence;
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
