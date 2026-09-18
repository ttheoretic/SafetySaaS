import { describe, it, expect } from 'vitest';
import { parseRepoRef } from './repo-ref';

const full = (s: string) => parseRepoRef(s)?.full ?? null;

describe('parseRepoRef', () => {
  it('accepts the plain shorthand', () => {
    expect(parseRepoRef('vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js',
      full: 'vercel/next.js',
    });
  });

  it('accepts the forms people actually paste', () => {
    expect(full('https://github.com/vercel/next.js')).toBe('vercel/next.js');
    expect(full('http://www.github.com/vercel/next.js/')).toBe('vercel/next.js');
    expect(full('github.com/vercel/next.js.git')).toBe('vercel/next.js');
    expect(full('  vercel/next.js  ')).toBe('vercel/next.js');
    expect(full('https://github.com/vercel/next.js/tree/canary')).toBe('vercel/next.js');
  });

  it('refuses any other host', () => {
    expect(full('https://gitlab.com/a/b')).toBeNull();
    expect(full('https://github.com.evil.test/a/b')).toBeNull();
    expect(full('https://evil.test/github.com/a/b')).toBeNull();
  });

  it('refuses non-http schemes', () => {
    expect(full('file:///etc/passwd')).toBeNull();
    expect(full('ftp://github.com/a/b')).toBeNull();
    expect(full('javascript:alert(1)')).toBeNull();
  });

  it('refuses traversal and injection attempts', () => {
    expect(full('../../etc/passwd')).toBeNull();
    expect(full('owner/..')).toBeNull();
    expect(full('owner/name/../../other')).toBeNull();
    expect(full('owner/name?ref=x')).toBeNull();
    expect(full('owner/na me')).toBeNull();
    expect(full('owner/name#frag')).toBeNull();
  });

  it('refuses incomplete or oversized input', () => {
    expect(full('')).toBeNull();
    expect(full('owner')).toBeNull();
    expect(full('/')).toBeNull();
    expect(full('a'.repeat(300))).toBeNull();
    expect(full(`owner/${'n'.repeat(101)}`)).toBeNull();
    expect(full(`${'o'.repeat(40)}/name`)).toBeNull();
  });

  it('refuses non-strings', () => {
    expect(parseRepoRef(null)).toBeNull();
    expect(parseRepoRef(42)).toBeNull();
    expect(parseRepoRef({ full: 'a/b' })).toBeNull();
    expect(parseRepoRef(['a/b'])).toBeNull();
  });

  it('refuses an unknown deep path rather than guessing', () => {
    expect(full('owner/name/something-else/x')).toBeNull();
  });
});
