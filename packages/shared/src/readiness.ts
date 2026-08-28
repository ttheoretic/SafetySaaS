/**
 * Release Readiness Engine.
 *
 * Answers "is it safe to ship what we have right now?" by combining the
 * signals Riscly already owns: open findings, the analysed changes since the
 * last release, dependency advisories, and the architecture itself.
 *
 * Deliberately conservative and explainable — every verdict comes with the
 * concrete blockers that produced it, so a solo founder reads three lines and
 * a security engineer can drill into each one.
 */

import { Finding, SEVERITY_ORDER, Severity } from './findings';
import { SystemGraph } from './model';
import { ChangeAnalysis } from './change';
import { DependencyVulnerability } from './vulnerabilities';

export type ReadinessVerdict = 'ready' | 'review' | 'blocked';

/** Which part of the product a reader should go to in order to act. */
export type ReadinessArea =
  | 'security'
  | 'reliability'
  | 'architecture'
  | 'dependency'
  | 'change'
  | 'coverage';

export interface ReadinessItem {
  area: ReadinessArea;
  severity: Severity;
  title: string;
  detail: string;
  /** How many findings/changes sit behind this item. */
  count: number;
  /** In-app route that shows the evidence. */
  href: string;
}

export interface ReadinessInput {
  /** Open findings only — callers filter out triaged/suppressed ones first. */
  findings: Finding[];
  graph?: SystemGraph | null;
  /** Analysed commits since the last release (or the recent window). */
  changes?: ChangeAnalysis[];
  vulnerabilities?: DependencyVulnerability[];
  /** ISO timestamp of the most recent successful scan. */
  lastScanAt?: string;
  /** Injected for deterministic tests. */
  now?: Date;
}

export interface ReadinessResult {
  verdict: ReadinessVerdict;
  /** 0..100 — how ready the system is; drops fast on real blockers. */
  score: number;
  /** One sentence stating the verdict in plain language. */
  headline: string;
  /** Must be resolved before shipping. */
  blockers: ReadinessItem[];
  /** Should be looked at, but does not stop a release. */
  warnings: ReadinessItem[];
  /** Checks that came back clean — reassurance, and proof of what was checked. */
  passed: string[];
}

/** A scan older than this no longer describes what you are about to ship. */
const STALE_SCAN_DAYS = 7;

const sevAtLeast = (f: { severity: Severity }, min: Severity) =>
  SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[min];

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export function releaseReadiness(input: ReadinessInput): ReadinessResult {
  const now = input.now ?? new Date();
  const findings = input.findings ?? [];
  const changes = input.changes ?? [];
  const vulns = input.vulnerabilities ?? [];

  const blockers: ReadinessItem[] = [];
  const warnings: ReadinessItem[] = [];
  const passed: string[] = [];

  // ---- 1. Never scanned: we cannot vouch for anything ----------------------
  if (!input.lastScanAt) {
    return {
      verdict: 'review',
      score: 0,
      headline: 'Not enough data — run a scan to judge release readiness.',
      blockers: [],
      warnings: [
        {
          area: 'coverage',
          severity: 'medium',
          title: 'No completed scan yet',
          detail:
            'Riscly has not analysed this project, so there is nothing to base a verdict on. Connect a repository and run the first scan.',
          count: 0,
          href: '/dashboard',
        },
      ],
      passed: [],
    };
  }

  // ---- 2. Security findings ----------------------------------------------
  const security = findings.filter((f) => f.category === 'security');
  const criticalSec = security.filter((f) => f.severity === 'critical');
  const highSec = security.filter((f) => f.severity === 'high');

  if (criticalSec.length > 0) {
    blockers.push({
      area: 'security',
      severity: 'critical',
      title: `${plural(criticalSec.length, 'critical security finding')} open`,
      detail: `${criticalSec[0].title}${criticalSec.length > 1 ? ` and ${criticalSec.length - 1} more` : ''}. Shipping with these open means shipping a known exploitable path.`,
      count: criticalSec.length,
      href: '/risks?severity=critical',
    });
  } else if (highSec.length > 0) {
    warnings.push({
      area: 'security',
      severity: 'high',
      title: `${plural(highSec.length, 'high-severity security finding')} open`,
      detail: `${highSec[0].title}. Not an automatic stop, but each one is a plausible way in.`,
      count: highSec.length,
      href: '/risks?severity=high',
    });
  } else {
    passed.push('No critical or high security findings open');
  }

  // ---- 3. Dependency advisories ------------------------------------------
  const criticalVulns = vulns.filter((v) => v.severity === 'critical');
  const highVulns = vulns.filter((v) => v.severity === 'high');
  if (criticalVulns.length > 0) {
    blockers.push({
      area: 'dependency',
      severity: 'critical',
      title: `${plural(criticalVulns.length, 'critical dependency advisory')}`,
      detail: `${criticalVulns[0].package}@${criticalVulns[0].version} — ${criticalVulns[0].summary}${criticalVulns[0].fixedVersion ? ` Fixed in ${criticalVulns[0].fixedVersion}.` : ''}`,
      count: criticalVulns.length,
      href: '/dependencies',
    });
  } else if (highVulns.length > 0) {
    warnings.push({
      area: 'dependency',
      severity: 'high',
      title: `${plural(highVulns.length, 'high-severity dependency advisory')}`,
      detail: `${highVulns[0].package}@${highVulns[0].version} — ${highVulns[0].summary}`,
      count: highVulns.length,
      href: '/dependencies',
    });
  } else if (vulns.length === 0) {
    passed.push('No known vulnerabilities in the resolved dependency tree');
  }

  // ---- 4. Reliability of the paths this release runs on -------------------
  const spofs = findings.filter((f) => f.category === 'spof' && sevAtLeast(f, 'high'));
  const noBackup = findings.filter((f) => f.category === 'backup');
  if (spofs.length > 0) {
    warnings.push({
      area: 'reliability',
      severity: 'high',
      title: `${plural(spofs.length, 'single point of failure')} on the critical path`,
      detail: `${spofs[0].title}. A release does not create this risk, but it is what turns a small failure into an outage.`,
      count: spofs.length,
      href: '/risks?category=spof',
    });
  } else {
    passed.push('No single point of failure on the critical path');
  }
  // A missing backup only *blocks* when this release actually touches data —
  // otherwise it is a standing reliability risk, not a release blocker.
  const touchesData = changes.some((c) =>
    c.signals.some(
      (s) =>
        s.title.includes('Database schema') || s.title.includes('Irreversible'),
    ),
  );
  if (noBackup.length > 0 && touchesData) {
    blockers.push({
      area: 'reliability',
      severity: 'high',
      title: 'Schema change with no verified backup',
      detail:
        'This release changes the database, and the data store has no automated backup — so the change is not reversible. Configure backups first.',
      count: noBackup.length,
      href: '/risks?category=backup',
    });
  } else if (noBackup.length > 0) {
    warnings.push({
      area: 'reliability',
      severity: 'high',
      title: 'A data store has no verified backup',
      detail:
        'Not a blocker for this release, but any future data loss would be permanent. Turn on automated backups.',
      count: noBackup.length,
      href: '/risks?category=backup',
    });
  } else if (graphHasDataStore(input.graph)) {
    passed.push('Every data store has backups configured');
  }

  // ---- 5. The changes themselves ------------------------------------------
  const riskyChanges = changes.filter((c) => c.risk === 'critical');
  const highChanges = changes.filter((c) => c.risk === 'high');
  if (riskyChanges.length > 0) {
    blockers.push({
      area: 'change',
      severity: 'critical',
      title: `${plural(riskyChanges.length, 'unreviewed high-impact change')}`,
      detail: `${riskyChanges[0].message.slice(0, 90)} — ${riskyChanges[0].summary}`,
      count: riskyChanges.length,
      href: '/changes',
    });
  } else if (highChanges.length > 0) {
    warnings.push({
      area: 'change',
      severity: 'high',
      title: `${plural(highChanges.length, 'change')} touching sensitive paths`,
      detail: `${highChanges[0].summary}`,
      count: highChanges.length,
      href: '/changes',
    });
  } else if (changes.length > 0) {
    passed.push(`${plural(changes.length, 'recent change')} reviewed, none high-impact`);
  }

  // A change that adds dependencies the last scan never saw means the scan is
  // out of date with respect to what is about to ship.
  const unscannedDeps = changes.flatMap((c) => c.newDependencies);
  if (unscannedDeps.length > 0 && isStale(input.lastScanAt, changes, now)) {
    warnings.push({
      area: 'coverage',
      severity: 'medium',
      title: `${plural(unscannedDeps.length, 'new dependency')} added after the last scan`,
      detail: `${[...new Set(unscannedDeps)].slice(0, 4).join(', ')} have not been checked yet. Re-scan so the advisory check covers them.`,
      count: unscannedDeps.length,
      href: '/dependencies',
    });
  }

  // ---- 6. Is the evidence still fresh? ------------------------------------
  const ageDays = daysBetween(new Date(input.lastScanAt), now);
  if (ageDays > STALE_SCAN_DAYS) {
    warnings.push({
      area: 'coverage',
      severity: 'medium',
      title: `Last scan was ${Math.round(ageDays)} days ago`,
      detail:
        'The verdict below describes the system as it was scanned, not as it is now. Re-scan for an accurate answer.',
      count: 0,
      href: '/dashboard',
    });
  } else {
    passed.push('Analysis is current with the connected sources');
  }

  // ---- Verdict ------------------------------------------------------------
  const verdict: ReadinessVerdict =
    blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'review' : 'ready';

  const penalty =
    blockers.reduce((s, b) => s + (b.severity === 'critical' ? 34 : 22), 0) +
    warnings.reduce((s, w) => s + (w.severity === 'high' ? 10 : 5), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    verdict,
    score,
    headline: headlineFor(verdict, blockers, warnings),
    blockers: sortItems(blockers),
    warnings: sortItems(warnings),
    passed,
  };
}

function headlineFor(
  verdict: ReadinessVerdict,
  blockers: ReadinessItem[],
  warnings: ReadinessItem[],
): string {
  if (verdict === 'blocked') {
    return blockers.length === 1
      ? `Not ready to ship: ${lower(blockers[0].title)}.`
      : `Not ready to ship: ${plural(blockers.length, 'blocker')}, starting with ${lower(blockers[0].title)}.`;
  }
  if (verdict === 'review') {
    return `Shippable, but ${plural(warnings.length, 'item')} deserve${warnings.length === 1 ? 's' : ''} a look first — ${lower(warnings[0].title)}.`;
  }
  return 'Ready to ship — no blocking risks in the current analysis.';
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function sortItems(items: ReadinessItem[]): ReadinessItem[] {
  return [...items].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );
}

/** Whether the mapped architecture contains anything that stores state. */
function graphHasDataStore(graph?: SystemGraph | null): boolean {
  return Boolean(
    graph?.nodes.some((n) => n.kind === 'database' || n.kind === 'storage'),
  );
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / 86_400_000;
}

/** True when a change landed after the last scan ran. */
function isStale(lastScanAt: string, changes: ChangeAnalysis[], now: Date): boolean {
  const scanned = new Date(lastScanAt).getTime();
  if (Number.isNaN(scanned)) return true;
  return changes.some((c) => {
    const t = new Date(c.date).getTime();
    return !Number.isNaN(t) && t > scanned && t <= now.getTime() + 60_000;
  });
}

export const READINESS_LABEL: Record<ReadinessVerdict, string> = {
  ready: 'READY',
  review: 'REVIEW',
  blocked: 'BLOCKED',
};
