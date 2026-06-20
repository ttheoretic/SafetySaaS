import type { ScanRecord } from '../store/store.module';

interface Finding {
  category?: string;
  severity?: string;
  title?: string;
  description?: string;
  nodeId?: string;
}

interface Recommendation {
  title?: string;
  priority?: string;
  businessImpact?: string;
  fix?: string;
  riskReductionPct?: number;
}

const SEV_ORDER = ['critical', 'high', 'medium', 'low'];

/** Render a scan's findings + recommendations as a reviewable Markdown plan. */
export function buildRemediationMarkdown(scan: ScanRecord): string {
  const findings = (scan.findings ?? []) as Finding[];
  const recs = (scan.recommendations ?? []) as Recommendation[];
  const score = scan.reliabilityScore;

  const counts: Record<string, number> = {};
  for (const f of findings) {
    const s = (f.severity ?? 'low').toLowerCase();
    counts[s] = (counts[s] ?? 0) + 1;
  }

  const sorted = [...findings].sort(
    (a, b) =>
      SEV_ORDER.indexOf((a.severity ?? 'low').toLowerCase()) -
      SEV_ORDER.indexOf((b.severity ?? 'low').toLowerCase()),
  );

  const lines: string[] = [];
  lines.push('# Riscly remediation plan');
  lines.push('');
  lines.push(
    `Generated from scan \`${scan.id}\` on ${new Date(
      scan.finishedAt ?? scan.createdAt,
    ).toISOString()}.`,
  );
  lines.push('');
  if (typeof score === 'number') {
    lines.push(`**Reliability score:** ${score} / 100`);
    lines.push('');
  }
  const summary = SEV_ORDER.filter((s) => counts[s])
    .map((s) => `${counts[s]} ${s}`)
    .join(' · ');
  lines.push(`**Open findings:** ${findings.length}${summary ? ` (${summary})` : ''}`);
  lines.push('');

  lines.push('## Findings');
  lines.push('');
  if (sorted.length === 0) {
    lines.push('_No findings in the latest scan._');
  } else {
    for (const f of sorted) {
      const sev = (f.severity ?? 'low').toUpperCase();
      lines.push(`### [${sev}] ${f.title ?? 'Untitled finding'}`);
      if (f.category) lines.push(`- **Category:** ${f.category}`);
      if (f.nodeId) lines.push(`- **Component:** \`${f.nodeId}\``);
      if (f.description) lines.push(`- ${f.description}`);
      lines.push('');
    }
  }

  if (recs.length > 0) {
    lines.push('## Recommended fixes');
    lines.push('');
    for (const r of recs) {
      lines.push(`### ${r.title ?? 'Recommendation'}`);
      if (r.priority) lines.push(`- **Priority:** ${r.priority}`);
      if (typeof r.riskReductionPct === 'number') {
        lines.push(`- **Risk reduction:** ~${r.riskReductionPct}%`);
      }
      if (r.businessImpact) lines.push(`- **Business impact:** ${r.businessImpact}`);
      if (r.fix) lines.push(`- **Fix:** ${r.fix}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(
    '_This plan was generated automatically by [Riscly](https://riscly.ai). ' +
      'Review and adjust before acting._',
  );
  return lines.join('\n');
}
