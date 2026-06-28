import { describe, it, expect } from 'vitest';
import { newAlertableFindings, buildCriticalAlertEmail } from './alerts';
import type { Finding } from '@riscly/shared';

const f = (over: Partial<Finding>): Finding => ({
  category: 'security',
  severity: 'critical',
  title: 'Public database',
  description: '',
  weight: 22,
  ...over,
});

describe('newAlertableFindings', () => {
  it('alerts on new criticals and verified-high, ignoring carried-over ones', () => {
    const prior = [f({ title: 'Old critical' })];
    const current = [
      f({ title: 'Old critical' }), // carried over → not new
      f({ title: 'New critical' }), // new critical → alert
      f({ severity: 'high', confidence: 'verified', title: 'Verified high' }), // alert
      f({ severity: 'high', confidence: 'heuristic', title: 'Heuristic high' }), // not alertable
      f({ severity: 'medium', title: 'Medium' }), // not alertable
    ];
    const fresh = newAlertableFindings(current, prior).map((x) => x.title);
    expect(fresh).toEqual(['New critical', 'Verified high']);
  });

  it('alerts on everything alertable on a first scan (no prior)', () => {
    const fresh = newAlertableFindings([f({}), f({ severity: 'low' })], []);
    expect(fresh).toHaveLength(1);
  });
});

describe('buildCriticalAlertEmail', () => {
  it('summarizes findings, escapes HTML, and links to the app', () => {
    const { subject, html } = buildCriticalAlertEmail(
      'orders-api',
      [f({ title: 'XSS <script>', file: 'a.ts', line: 4 })],
      'https://app.riscly.ai',
    );
    expect(subject).toContain('1 new critical risk in orders-api');
    expect(html).toContain('&lt;script&gt;'); // escaped
    expect(html).toContain('a.ts:4');
    expect(html).toContain('https://app.riscly.ai/risks');
  });
});
