import { describe, it, expect } from 'vitest';
import { buildReport, renderReportText } from './report';
import { exampleGraph, exampleBusiness } from './fixtures';

const NOW = '2026-06-14T00:00:00.000Z';

describe('report engine', () => {
  it('builds an executive report with scores and worst-case exposure', () => {
    const r = buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW });
    expect(r.title).toContain('Executive');
    expect(r.reliabilityScore).toBeGreaterThanOrEqual(0);
    const summary = r.sections.find((s) => s.heading === 'Executive Summary');
    expect(summary?.lines.some((l) => l.label === 'Worst-case 1h revenue exposure')).toBe(true);
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

  it('renders deterministic plain text', () => {
    const a = renderReportText(buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW }));
    const b = renderReportText(buildReport(exampleGraph, exampleBusiness, 'executive', { now: NOW }));
    expect(a).toBe(b);
    expect(a).toContain('Executive Risk Report');
  });
});
