/**
 * Report content engine (pure).
 *
 * Composes the engines into a structured, audience-specific report. Rendering
 * to JSON / HTML / PDF is a separate concern (in the API) — this produces the
 * content model so all formats stay consistent and the content is testable.
 */

import { SystemGraph, BusinessContext } from './model';
import { Severity } from './findings';
import { reliabilityScore } from './reliability';
import { securitySimulation } from './security';
import { buildRecommendations } from './recommendations';
import { predictFailures } from './prediction';
import { simulateFailure, SimulationType } from './simulation';
import { revenueImpact } from './revenue';

export type ReportType = 'executive' | 'cto' | 'security' | 'full';

export interface ReportLine {
  label?: string;
  text: string;
  severity?: Severity;
}

export interface ReportSection {
  heading: string;
  lines: ReportLine[];
}

export interface Report {
  type: ReportType;
  title: string;
  generatedAt: string;
  reliabilityScore: number;
  securityScore: number;
  sections: ReportSection[];
}

const TITLES: Record<ReportType, string> = {
  executive: 'Executive Risk Report',
  cto: 'CTO Architecture & Reliability Report',
  security: 'Security Report',
  full: 'Full System Report',
};

export interface BuildReportOptions {
  now?: string;
}

export function buildReport(
  graph: SystemGraph,
  business: BusinessContext | undefined,
  type: ReportType,
  opts: BuildReportOptions = {},
): Report {
  const reliability = reliabilityScore(graph);
  const security = securitySimulation(graph);
  const recommendations = buildRecommendations(reliability.findings);
  const generatedAt = opts.now ?? new Date().toISOString();

  const sections: ReportSection[] = [];

  if (type === 'executive' || type === 'full') {
    sections.push(executiveSummary(graph, business, reliability.score, security.score));
    sections.push(topRisks(reliability.findings));
    sections.push(topRecommendations(recommendations, 3));
  }

  if (type === 'cto' || type === 'full') {
    sections.push(architectureSection(graph));
    sections.push(allFindings(reliability.findings));
    sections.push(predictionsSection(graph, business));
    if (type === 'cto') sections.push(topRecommendations(recommendations, 10));
  }

  if (type === 'security' || type === 'full') {
    sections.push(securitySection(security));
  }

  return {
    type,
    title: TITLES[type],
    generatedAt,
    reliabilityScore: reliability.score,
    securityScore: security.score,
    sections,
  };
}

function executiveSummary(
  graph: SystemGraph,
  business: BusinessContext | undefined,
  reliabilityScoreValue: number,
  securityScoreValue: number,
): ReportSection {
  const lines: ReportLine[] = [
    { label: 'Reliability score', text: `${reliabilityScoreValue} / 100` },
    { label: 'Security score', text: `${securityScoreValue} / 100` },
  ];
  if (business) {
    // Worst-case single-event revenue exposure across the headline scenarios.
    const scenarios: SimulationType[] = ['dns', 'db_lock', 'stripe_down', 'infra_region'];
    let worst = 0;
    for (const type of scenarios) {
      const sim = simulateFailure(graph, type);
      worst = Math.max(worst, revenueImpact(sim, business, 1).totalImpact);
    }
    lines.push({
      label: 'Worst-case 1h revenue exposure',
      text: formatMoney(worst, business.currency ?? 'EUR'),
      severity: 'high',
    });
  }
  return { heading: 'Executive Summary', lines };
}

function topRisks(findings: ReturnType<typeof reliabilityScore>['findings']): ReportSection {
  return {
    heading: 'Top Risks',
    lines: findings.slice(0, 5).map((f) => ({
      label: f.severity.toUpperCase(),
      text: f.title,
      severity: f.severity,
    })),
  };
}

function topRecommendations(
  recommendations: ReturnType<typeof buildRecommendations>,
  limit: number,
): ReportSection {
  return {
    heading: 'Recommended Actions',
    lines: recommendations.slice(0, limit).map((r) => ({
      label: `-${r.riskReductionPct}% risk`,
      text: `${r.fix}`,
      severity: r.priority as Severity,
    })),
  };
}

function architectureSection(graph: SystemGraph): ReportSection {
  const byKind = new Map<string, number>();
  for (const n of graph.nodes) byKind.set(n.kind, (byKind.get(n.kind) ?? 0) + 1);
  const lines: ReportLine[] = [
    { label: 'Components', text: String(graph.nodes.length) },
    { label: 'Dependencies', text: String(graph.edges.length) },
    ...[...byKind.entries()].map(([kind, count]) => ({
      label: kind,
      text: String(count),
    })),
  ];
  return { heading: 'Architecture Overview', lines };
}

function allFindings(findings: ReturnType<typeof reliabilityScore>['findings']): ReportSection {
  return {
    heading: 'Reliability Findings',
    lines: findings.map((f) => ({
      label: f.severity.toUpperCase(),
      text: `${f.title} — ${f.description}`,
      severity: f.severity,
    })),
  };
}

function predictionsSection(
  graph: SystemGraph,
  business: BusinessContext | undefined,
): ReportSection {
  const preds = predictFailures(graph, { currentUsers: business?.activeUsers });
  return {
    heading: 'AI Failure Predictions',
    lines: preds.slice(0, 6).map((p) => ({
      label: p.horizon,
      text: `${p.title} (${Math.round(p.likelihood * 100)}% likely)`,
      severity: p.severity,
    })),
  };
}

function securitySection(security: ReturnType<typeof securitySimulation>): ReportSection {
  const lines: ReportLine[] = [
    { label: 'Security score', text: `${security.score} / 100` },
    ...security.exposures.map((e) => ({
      label: e.attack.replace(/_/g, ' '),
      text: e.exposed ? `EXPOSED — ${e.reason}` : 'Protected',
      severity: (e.exposed ? 'high' : 'low') as Severity,
    })),
    ...security.findings.map((f) => ({
      label: f.severity.toUpperCase(),
      text: f.title,
      severity: f.severity,
    })),
  ];
  return { heading: 'Security Analysis', lines };
}

function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Plain-text rendering — used by the PDF writer and for snapshots. */
export function renderReportText(report: Report): string {
  const out: string[] = [report.title, `Generated: ${report.generatedAt}`, ''];
  for (const section of report.sections) {
    out.push(section.heading);
    out.push('-'.repeat(section.heading.length));
    for (const line of section.lines) {
      out.push(line.label ? `  [${line.label}] ${line.text}` : `  ${line.text}`);
    }
    out.push('');
  }
  return out.join('\n');
}
