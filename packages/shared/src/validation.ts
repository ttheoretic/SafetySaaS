/**
 * Validation — turning a finding from a claim into a fact.
 *
 * A scan says "this looks wrong". Validation goes back to the source of truth
 * and asks "is it still wrong, right now?". That matters in both directions:
 * a confirmed finding earns `verified` confidence and full weight in the risk
 * posture, while one that can no longer be reproduced stops inflating the
 * score after the customer has already fixed it.
 *
 * Deliberately narrow: we only claim a result for checks we can actually
 * perform. Anything we cannot re-test comes back `inconclusive` rather than
 * being quietly counted as a pass — a test that always passes is worse than no
 * test at all.
 */

import { Confidence, Finding, SEVERITY_ORDER, Severity } from './findings';
import { findingFingerprint } from './triage';

export type CheckOutcome =
  /** Re-tested and the problem is still there. */
  | 'confirmed'
  /** Re-tested and it no longer reproduces — likely fixed. */
  | 'resolved'
  /** Could not be re-tested (no access, unsupported rule, provider error). */
  | 'inconclusive';

/** What kind of evidence a check went after. */
export type CheckKind =
  | 'secret_live'
  | 'dependency_advisory'
  | 'code_location'
  | 'configuration';

export interface ValidationCheck {
  /** Fingerprint of the finding this check re-tested. */
  fingerprint: string;
  kind: CheckKind;
  outcome: CheckOutcome;
  /** The finding's title, so a run reads on its own. */
  title: string;
  severity: Severity;
  /** What was actually done and what came back. */
  detail: string;
  file?: string;
  line?: number;
  repo?: string;
}

export interface ValidationRun {
  id: string;
  projectId: string;
  /** ISO timestamp. */
  startedAt: string;
  finishedAt?: string;
  checks: ValidationCheck[];
}

export interface ValidationSummary {
  total: number;
  confirmed: number;
  resolved: number;
  inconclusive: number;
  /** Share of checks that produced a definite answer, 0..1. */
  coverage: number;
}

export function summarize(checks: ValidationCheck[]): ValidationSummary {
  const total = checks.length;
  const confirmed = checks.filter((c) => c.outcome === 'confirmed').length;
  const resolved = checks.filter((c) => c.outcome === 'resolved').length;
  const inconclusive = checks.filter((c) => c.outcome === 'inconclusive').length;
  return {
    total,
    confirmed,
    resolved,
    inconclusive,
    coverage: total === 0 ? 0 : (confirmed + resolved) / total,
  };
}

/**
 * Fold a validation run back into the findings, so the risk posture reflects
 * what was actually re-tested:
 *
 *  - confirmed  → `verified` confidence; a live secret is raised to critical,
 *                 because "this credential works right now" is a different
 *                 problem from "this looks like a credential".
 *  - resolved   → dropped from the open set; the evidence is gone.
 *  - inconclusive → left exactly as it was. An untested finding must not get
 *                 quieter just because we could not reach the source.
 */
export function applyValidation(
  findings: Finding[],
  checks: ValidationCheck[],
): Finding[] {
  if (checks.length === 0) return findings;
  const byFingerprint = new Map(checks.map((c) => [c.fingerprint, c]));

  const out: Finding[] = [];
  for (const f of findings) {
    const check = byFingerprint.get(findingFingerprint(f));
    if (!check || check.outcome === 'inconclusive') {
      out.push(f);
      continue;
    }
    if (check.outcome === 'resolved') continue;

    const confidence: Confidence = 'verified';
    const severity: Severity =
      check.kind === 'secret_live' && SEVERITY_ORDER[f.severity] < SEVERITY_ORDER.critical
        ? 'critical'
        : f.severity;
    out.push({ ...f, confidence, severity });
  }
  return out;
}

/** Findings a validation run could meaningfully re-test, in priority order. */
export function validatable(findings: Finding[]): Finding[] {
  return findings
    .filter((f) => checkKindFor(f) !== null)
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
}

/** Which kind of check applies to a finding, or null when none does. */
export function checkKindFor(f: Finding): CheckKind | null {
  if (f.rule?.startsWith('secret/')) return 'secret_live';
  if (f.rule?.startsWith('dep/') || f.category === 'vendor_lock_in') {
    return f.rule?.startsWith('dep/') ? 'dependency_advisory' : null;
  }
  if (f.file && f.rule) return 'code_location';
  if (f.category === 'backup' || f.category === 'rate_limit' || f.category === 'redundancy') {
    return 'configuration';
  }
  return null;
}

export const OUTCOME_LABEL: Record<CheckOutcome, string> = {
  confirmed: 'Confirmed',
  resolved: 'Resolved',
  inconclusive: 'Inconclusive',
};

export const CHECK_KIND_LABEL: Record<CheckKind, string> = {
  secret_live: 'Live credential check',
  dependency_advisory: 'Advisory re-check',
  code_location: 'Source re-read',
  configuration: 'Configuration re-read',
};
