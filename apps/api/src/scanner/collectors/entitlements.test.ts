import { describe, it, expect } from 'vitest';
import { filterByEntitlements } from './collector';

const items = [
  { rule: 'js/eval' }, // SAST
  { rule: 'secret/aws-access-key' }, // secret
  { rule: 'secret-file/env' }, // secret (file)
  { rule: 'docker/root-user' }, // IaC
  { rule: 'py/pickle' }, // SAST
];

describe('filterByEntitlements', () => {
  it('keeps everything when entitlements are undefined (tests / public path)', () => {
    expect(filterByEntitlements(items, undefined)).toHaveLength(5);
  });

  it('keeps everything when secrets + iac are enabled', () => {
    expect(filterByEntitlements(items, { secrets: true, iac: true })).toHaveLength(5);
  });

  it('drops secret findings when secret scanning is not entitled (e.g. Growth)', () => {
    const out = filterByEntitlements(items, { secrets: false, iac: true })!;
    expect(out.map((i) => i.rule)).toEqual(['js/eval', 'docker/root-user', 'py/pickle']);
  });

  it('drops IaC findings when IaC is not entitled', () => {
    const out = filterByEntitlements(items, { secrets: true, iac: false })!;
    expect(out.some((i) => i.rule === 'docker/root-user')).toBe(false);
  });

  it('keeps only SAST when neither secrets nor IaC are entitled', () => {
    const out = filterByEntitlements(items, { secrets: false, iac: false })!;
    expect(out.map((i) => i.rule)).toEqual(['js/eval', 'py/pickle']);
  });
});
