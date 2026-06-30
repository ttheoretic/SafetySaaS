import { describe, it, expect } from 'vitest';
import { findingFingerprint, isSuppressed } from './triage';

describe('findingFingerprint', () => {
  it('is stable for the same logical finding (ignores line)', () => {
    const a = findingFingerprint({ rule: 'js/eval', file: 'src/a.ts', title: 'Use of eval()' });
    const b = findingFingerprint({ rule: 'js/eval', file: 'src/a.ts', title: 'Use of eval()' });
    expect(a).toBe(b);
  });

  it('normalizes case/whitespace in the title', () => {
    const a = findingFingerprint({ rule: 'js/eval', file: 'src/a.ts', title: 'Use of  eval()' });
    const b = findingFingerprint({ rule: 'js/eval', file: 'src/a.ts', title: 'use of eval()' });
    expect(a).toBe(b);
  });

  it('differs across rule / file / node', () => {
    const base = { rule: 'js/eval', file: 'src/a.ts', title: 'x' };
    expect(findingFingerprint(base)).not.toBe(findingFingerprint({ ...base, file: 'src/b.ts' }));
    expect(findingFingerprint(base)).not.toBe(findingFingerprint({ ...base, rule: 'js/new-function' }));
    expect(findingFingerprint(base)).not.toBe(findingFingerprint({ ...base, nodeId: 'api' }));
  });
});

describe('isSuppressed', () => {
  it('treats anything but open as suppressed', () => {
    expect(isSuppressed('open')).toBe(false);
    expect(isSuppressed(undefined)).toBe(false);
    expect(isSuppressed('false_positive')).toBe(true);
    expect(isSuppressed('accepted_risk')).toBe(true);
    expect(isSuppressed('resolved')).toBe(true);
  });
});
