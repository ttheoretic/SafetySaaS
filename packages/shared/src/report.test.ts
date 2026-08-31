import { describe, it, expect } from 'vitest';
import { buildReport, renderReportText, renderReportCsv, renderReportXls } from './report';
import { exampleGraph, exampleBusiness } from './fixtures';

const NOW = '2026-06-14T00:00:00.000Z';

describe('report engine', () => {
  it('builds an executive report with scores and the worst-case blast radius', () => {
    const r = buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW });
    expect(r.title).toContain('Executive');
    expect(r.reliabilityScore).toBeGreaterThanOrEqual(0);
    const summary = r.sections.find((s) => s.heading === 'Executive Summary');
    // Impact is expressed as blast radius, never as a money estimate: an outage
    // cost derived from a dependency graph would be a guess dressed as a fact.
    expect(summary?.lines.some((l) => l.label === 'Worst-case blast radius')).toBe(true);
    expect(summary?.lines.some((l) => /revenue|€|\$/i.test(l.label + l.text))).toBe(false);
  });

  it('a CTO report includes architecture and predictions', () => {
    const r = buildReport(exampleGraph, exampleBusiness, 'cto', { now: NOW });
    const headings = r.sections.map((s) => s.heading);
    expect(headings).toContain('Architecture Overview');
    expect(headings).toContain('AI Failure Predictions');
  });

  it('a security report includes attack exposure', () => {
    const r = buildReport(exampleGraph, undefined, 'security', { now: NOW });
    const sec = r.sections.find((s) => s.heading === 'Security Analysis');
    expect(sec).toBeDefined();
    expect(sec!.lines.some((l) => /EXPOSED|Protected/.test(l.text))).toBe(true);
  });

  it('a full report contains every section type', () => {
    const r = buildReport(exampleGraph, exampleBusiness, 'full', { now: NOW });
    const headings = r.sections.map((s) => s.heading);
    expect(headings).toContain('Executive Summary');
    expect(headings).toContain('Architecture Overview');
    expect(headings).toContain('Security Analysis');
  });

  it('builds board and compliance reports', () => {
    const board = buildReport(exampleGraph, exampleBusiness, 'board', { now: NOW });
    expect(board.title).toBe('Board Report');
    const compliance = buildReport(exampleGraph, undefined, 'compliance', { now: NOW });
    expect(compliance.sections.some((s) => s.heading === 'Compliance Posture')).toBe(true);
  });

  it('exports CSV with a header row and quoting', () => {
    const report = buildReport(exampleGraph, exampleBusiness, 'full', { now: NOW });
    const csv = renderReportCsv(report);
    expect(csv.split('\n').some((l) => l.startsWith('Section,Label,Detail'))).toBe(true);
    // descriptions contain commas, so at least one field must be quote-wrapped
    expect(csv).toContain('"');
  });

  it('exports valid SpreadsheetML for Excel', () => {
    const xls = renderReportXls(buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW }));
    expect(xls).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xls).toContain('<Worksheet ss:Name="Report">');
    expect(xls).toContain('<Data ss:Type="String">');
  });

  it('renders deterministic plain text', () => {
    const a = renderReportText(buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW }));
    const b = renderReportText(buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW }));
    expect(a).toBe(b);
    expect(a).toContain('Executive Risk Report');
  });
});
