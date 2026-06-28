import { describe, it, expect, vi } from 'vitest';
import { auditRepoCode, redactSecret } from './code-audit';

describe('redactSecret', () => {
  it('masks the matched secret but keeps a locating hint', () => {
    // Built at runtime so the literal isn't a scannable secret in source.
    const fake = 'sk_' + 'live_' + 'a'.repeat(24);
    const re = /sk_live_[0-9a-zA-Z]{20,}/;
    const out = redactSecret(`const k = "${fake}"`, re);
    expect(out).not.toContain(fake);
    expect(out).toContain('••••');
    expect(out).toContain('sk_'); // short hint preserved
  });

  it('fully masks very short matches', () => {
    expect(redactSecret('x=secret', /secret/)).toBe('x=••••');
  });
});

/** Build a fetch that serves a tree listing and file contents from a map. */
function fakeRepo(tree: string[], files: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/git/trees/')) {
      return {
        ok: true, status: 200,
        json: async () => ({ tree: tree.map((path) => ({ path, type: 'blob' })) }),
      } as Response;
    }
    const m = u.match(/\/contents\/(.+)$/);
    const path = m ? decodeURIComponent(m[1]) : '';
    const content = files[path];
    if (content === undefined) return { ok: false, status: 404 } as Response;
    return {
      ok: true, status: 200,
      json: async () => ({ content: Buffer.from(content).toString('base64'), encoding: 'base64', size: content.length }),
    } as Response;
  }) as unknown as typeof fetch;
}

const ctx = (fetchImpl: typeof fetch) => ({ token: 't', fetchImpl });

describe('auditRepoCode', () => {
  it('flags a committed .env but not .env.example', async () => {
    const fetchImpl = fakeRepo(['.env', '.env.example'], { '.env': 'DB_URL=postgres://x' });
    const { findings, issues } = await auditRepoCode('acme/web', ctx(fetchImpl));
    expect(findings.some((f) => f.title.includes('Committed') && f.title.includes('.env'))).toBe(true);
    expect(findings.some((f) => f.title.includes('.env.example'))).toBe(false);
    // The issue is located to the file.
    expect(issues.some((i) => i.file === '.env' && i.rule === 'secret-file/env')).toBe(true);
  });

  it('detects a secret inside a committed env file with a line number', async () => {
    const fetchImpl = fakeRepo(['.env'], { '.env': 'FOO=1\nSTRIPE=sk_live_0123456789abcdefABCDEF' });
    const { findings, issues } = await auditRepoCode('acme/web', ctx(fetchImpl));
    expect(findings.some((f) => f.title.includes('Stripe live secret key') && f.severity === 'critical')).toBe(true);
    const stripe = issues.find((i) => i.rule === 'secret/stripe-live-key');
    expect(stripe?.line).toBe(2);
  });

  it('flags an insecure Dockerfile (root user + unpinned base)', async () => {
    const fetchImpl = fakeRepo(['Dockerfile'], { Dockerfile: 'FROM node:latest\nCOPY . .\nCMD ["node","x"]' });
    const { findings } = await auditRepoCode('acme/web', ctx(fetchImpl));
    expect(findings.some((f) => /runs as root/i.test(f.title))).toBe(true);
    expect(findings.some((f) => /unpinned base image/i.test(f.title))).toBe(true);
  });

  it('returns nothing without a token', async () => {
    const fetchImpl = fakeRepo(['.env'], { '.env': 'x=1' });
    expect(await auditRepoCode('acme/web', { fetchImpl })).toEqual({ findings: [], issues: [] });
  });

  it('finds source-level vulnerabilities with line numbers', async () => {
    const py = [
      'import requests',
      'r = requests.get(url)',           // line 2: missing timeout
      'data = pickle.loads(blob)',        // line 3: insecure deserialization
    ].join('\n');
    const ts = [
      'export function run(input) {',
      '  return eval(input)',             // line 2: eval
      '}',
    ].join('\n');
    const fetchImpl = fakeRepo(['src/app.py', 'src/run.ts'], {
      'src/app.py': py,
      'src/run.ts': ts,
    });
    const { issues } = await auditRepoCode('acme/web', ctx(fetchImpl));
    const timeout = issues.find((i) => i.rule === 'py/requests-timeout');
    expect(timeout?.file).toBe('src/app.py');
    expect(timeout?.line).toBe(2);
    expect(issues.some((i) => i.rule === 'py/pickle' && i.line === 3)).toBe(true);
    expect(issues.some((i) => i.rule === 'js/eval' && i.file === 'src/run.ts' && i.line === 2)).toBe(true);
  });

  it('skips vendored / build directories', async () => {
    const fetchImpl = fakeRepo(
      ['node_modules/x/index.js', 'dist/bundle.js'],
      {
        'node_modules/x/index.js': 'eval("x")',
        'dist/bundle.js': 'eval("y")',
      },
    );
    const { issues } = await auditRepoCode('acme/web', ctx(fetchImpl));
    expect(issues).toEqual([]);
  });
});
