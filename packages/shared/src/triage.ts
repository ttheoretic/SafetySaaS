/**
 * Finding triage / suppression.
 *
 * Findings are re-derived on every scan, so they have no stable database id.
 * To persist a triage decision (in progress, false positive, accepted risk,
 * resolved) across
 * scans we key it by a deterministic fingerprint of the finding's identity —
 * rule + file + node + normalized title — computed identically on the API and
 * the web so both agree on which finding a suppression refers to.
 */

export type TriageStatus =
  | 'open'
  | 'in_progress'
  | 'false_positive'
  | 'accepted_risk'
  | 'resolved';

/**
 * A finding is suppressed (hidden from active risk + alerts) once it has been
 * dismissed or fixed. `in_progress` is NOT suppressed — someone is working on
 * it, but the risk is still live until it is actually resolved.
 */
export const SUPPRESSED_STATUSES: TriageStatus[] = ['false_positive', 'accepted_risk', 'resolved'];

export function isSuppressed(status: TriageStatus | undefined): boolean {
  return status !== undefined && SUPPRESSED_STATUSES.includes(status);
}

export interface FingerprintInput {
  rule?: string;
  file?: string;
  nodeId?: string;
  title: string;
}

function norm(s?: string): string {
  return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Stable, dependency-free fingerprint (djb2 → hex) for a finding's identity. */
export function findingFingerprint(f: FingerprintInput): string {
  const key = [norm(f.rule), norm(f.file), norm(f.nodeId), norm(f.title)].join('|');
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const TRIAGE_LABEL: Record<TriageStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  false_positive: 'False positive',
  accepted_risk: 'Accepted risk',
  resolved: 'Resolved',
};
