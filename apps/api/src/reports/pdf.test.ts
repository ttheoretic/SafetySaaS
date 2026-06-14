import { describe, it, expect } from 'vitest';
import { buildReport, exampleGraph, exampleBusiness } from '@failsafe/shared';
import { renderReportPdf } from './pdf';

describe('PDF writer', () => {
  it('produces a valid, non-trivial PDF document', () => {
    const report = buildReport(exampleGraph, exampleBusiness, 'full', {
      now: '2026-06-14T00:00:00.000Z',
    });
    const pdf = renderReportPdf(report);
    const head = pdf.subarray(0, 8).toString('latin1');
    const tail = pdf.subarray(-5).toString('latin1');
    expect(head.startsWith('%PDF-1.')).toBe(true);
    expect(tail).toBe('%%EOF');
    expect(pdf.length).toBeGreaterThan(1000);
    // Has an xref table and a catalog.
    const text = pdf.toString('latin1');
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('xref');
  });

  it('escapes parentheses so the content stream stays valid', () => {
    const report = buildReport(exampleGraph, exampleBusiness, 'executive', {
      now: '2026-06-14T00:00:00.000Z',
    });
    // Inject a risky title.
    report.title = 'Report (v2) \\ test';
    const pdf = renderReportPdf(report).toString('latin1');
    expect(pdf).toContain('Report \\(v2\\)');
  });
});
