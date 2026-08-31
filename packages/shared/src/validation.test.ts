import { describe, it, expect } from 'vitest';
import {
  applyValidation,
  checkKindFor,
  summarize,
  validatable,
  type ValidationCheck,
} from './validation';
import { findingFingerprint } from './triage';
import type { Finding } from './findings';

const f = (over: Partial<Finding> = {}): Finding => ({
  category: 'security',
  severity: 'high',
  title: 'Committed Stripe key',
  description: '...',
  weight: 14,
  rule: 'secret/stripe-live-key',
  file: 'src/config.ts',
  line: 4,
  confidence: 'heuristic',
  ...over,
});

const check = (finding: Finding, over: Partial<ValidationCheck> = {}): ValidationCheck => ({
  fingerprint: findingFingerprint(finding),
  kind: 'secret_live',
  outcome: 'confirmed',
  title: finding.title,
  severity: finding.severity,
  detail: 'The provider accepted the credential.',
  ...over,
});

describe('checkKindFor', () => {
  it('picks the check that fits the evidence', () => {
    expect(checkKindFor(f())).toBe('secret_live');
    expect(checkKindFor(f({ rule: 'dep/CVE-2024-1', file: undefined }))).toBe('dependency_advisory');
    expect(checkKindFor(f({ rule: 'js/eval' }))).toBe('code_location');
    expect(checkKindFor(f({ category: 'backup', rule: undefined, file: undefined }))).toBe('configuration');
  });

  it('returns null when nothing can be re-tested', () => {
    expect(checkKindFor(f({ category: 'spof', rule: undefined, file: undefined }))).toBeNull();
  });
});

describe('applyValidation', () => {
  it('leaves findings untouched when nothing was validated', () => {
    const list = [f()];
    expect(applyValidation(list, [])).toBe(list);
  });

  it('promotes a confirmed live secret to critical and verified', () => {
    const finding = f();
    const [out] = applyValidation([finding], [check(finding)]);
    expect(out.confidence).toBe('verified');
    expect(out.severity).toBe('critical');
  });

  it('does not inflate severity for non-secret confirmations', () => {
    const finding = f({ rule: 'js/eval', severity: 'medium' });
    const [out] = applyValidation([finding], [check(finding, { kind: 'code_location' })]);
    expect(out.confidence).toBe('verified');
    expect(out.severity).toBe('medium');
  });

  it('drops a finding that no longer reproduces', () => {
    const finding = f();
    expect(applyValidation([finding], [check(finding, { outcome: 'resolved' })])).toEqual([]);
  });

  it('leaves an inconclusive finding exactly as it was', () => {
    const finding = f();
    const [out] = applyValidation([finding], [check(finding, { outcome: 'inconclusive' })]);
    expect(out).toEqual(finding);
  });

  it('only touches the findings that were actually checked', () => {
    const checked = f();
    const other = f({ title: 'Something else', rule: 'js/eval' });
    const out = applyValidation([checked, other], [check(checked)]);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual(other);
  });
});

describe('summarize', () => {
  it('counts outcomes and reports how much was conclusive', () => {
    const finding = f();
    const s = summarize([
      check(finding),
      check(finding, { outcome: 'resolved' }),
      check(finding, { outcome: 'inconclusive' }),
      check(finding, { outcome: 'inconclusive' }),
    ]);
    expect(s).toMatchObject({ total: 4, confirmed: 1, resolved: 1, inconclusive: 2 });
    expect(s.coverage).toBe(0.5);
  });

  it('reports zero coverage for an empty run rather than dividing by zero', () => {
    expect(summarize([]).coverage).toBe(0);
  });
});

describe('validatable', () => {
  it('keeps only re-testable findings, worst first', () => {
    const list = validatable([
      f({ severity: 'low' }),
      f({ category: 'spof', rule: undefined, file: undefined }),
      f({ severity: 'critical' }),
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].severity).toBe('critical');
  });
});
