import { describe, it, expect, vi } from 'vitest';
import { auditRepoCode } from './code-audit';

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
});
