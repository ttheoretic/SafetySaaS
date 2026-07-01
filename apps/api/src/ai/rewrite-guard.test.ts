import { describe, expect, it } from 'vitest';
import { isSafeRewrite } from './anthropic.provider';

describe('isSafeRewrite', () => {
  const original = [
    'function handler(req, res) {',
    '  if (req.ok) {',
    '    doThing(req.body)',
    '  }',
    '}',
  ].join('\n');

  it('accepts a balanced, similar-length rewrite', () => {
    const fixed = [
      'function handler(req, res) {',
      '  if (!req.ok) return',
      '  doThing(req.body)',
      '}',
    ].join('\n');
    expect(isSafeRewrite(original, fixed)).toBe(true);
  });

  it('rejects an empty rewrite', () => {
    expect(isSafeRewrite(original, '   ')).toBe(false);
  });

  it('rejects a truncated fragment', () => {
    expect(isSafeRewrite(original, 'function handler(req, res) {')).toBe(false);
  });

  it('rejects a rewrite that unbalances brackets (would corrupt the file)', () => {
    const broken = [
      'function handler(req, res) {',
      '  if (req.ok) {',
      '    doThing(req.body)',
      // missing the two closing braces → net balance changed
    ].join('\n');
    expect(isSafeRewrite(original, broken)).toBe(false);
  });

  it('works for brace-less languages (Python)', () => {
    const py = ['def handler(req):', '    if req.ok:', '        do_thing(req.body)'].join('\n');
    const fixed = ['def handler(req):', '    if not req.ok:', '        return', '    do_thing(req.body)'].join('\n');
    expect(isSafeRewrite(py, fixed)).toBe(true);
  });
});
