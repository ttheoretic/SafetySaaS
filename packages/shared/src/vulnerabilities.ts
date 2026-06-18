import { Finding, Severity } from './findings';

/**
 * A known vulnerability affecting a specific dependency version, discovered by
 * resolving a repo's lockfiles and querying the OSV.dev database. This is real
 * software-composition analysis (SCA): concrete CVEs/advisories in the actual
 * dependency tree, not inferred from topology.
 */
export interface DependencyVulnerability {
  /** Advisory id, e.g. "GHSA-xxxx-yyyy-zzzz" or "CVE-2024-1234". */
  id: string;
  /** Package name, e.g. "lodash". */
  package: string;
  /** Resolved version the advisory affects, e.g. "4.17.20". */
  version: string;
  /** OSV ecosystem, e.g. "npm", "PyPI", "Go". */
  ecosystem: string;
  severity: Severity;
  /** One-line advisory summary. */
  summary: string;
  /** First fixed version, when the advisory declares one. */
  fixedVersion?: string;
  /** "owner/name" of the repo the dependency was found in. */
  repo: string;
  /** Advisory URLs for grounding. */
  references?: string[];
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 3,
  medium: 8,
  high: 14,
  critical: 20,
};

/**
 * Turn dependency vulnerabilities into reliability/security findings so they
 * feed the score and recommendation pipeline alongside topology findings.
 */
export function vulnerabilitiesToFindings(vulns: DependencyVulnerability[]): Finding[] {
  return vulns.map((v) => ({
    category: 'security',
    severity: v.severity,
    title: `${v.package}@${v.version}: ${v.id}`,
    description:
      `${v.summary}` +
      (v.fixedVersion ? ` Fixed in ${v.fixedVersion}.` : ' No fixed version published yet.') +
      ` (${v.repo})`,
    weight: SEVERITY_WEIGHT[v.severity],
  }));
}

/** Highest severity present in a vulnerability list (for headline counters). */
export function maxVulnSeverity(vulns: DependencyVulnerability[]): Severity | undefined {
  const order: Severity[] = ['low', 'medium', 'high', 'critical'];
  let best = -1;
  for (const v of vulns) best = Math.max(best, order.indexOf(v.severity));
  return best >= 0 ? order[best] : undefined;
}
