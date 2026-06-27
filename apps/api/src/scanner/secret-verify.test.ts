import { describe, it, expect, vi } from 'vitest';
import { verifySecrets } from './secret-verify';
import type { CodeIssue } from '@riscly/shared';

const issue = (over: Partial<CodeIssue>): CodeIssue => ({
  id: 'i',
  file: 'config.ts',
  line: 1,
  rule: 'secret/github-pat',
  severity: 'critical',
  title: 'Possible GitHub personal access token in code',
  description: 'A value matching a GitHub token pattern was found.',
  confidence: 'heuristic',
  ...over,
});

const token = 'ghp_' + 'a'.repeat(36);

describe('verifySecrets', () => {
  it('upgrades a confirmed-live token to a verified critical finding', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response) as unknown as typeof fetch;
    const issues = [issue({})];
    await verifySecrets(issues, [{ path: 'config.ts', content: `const t = "${token}"` }], fetchImpl);
    expect(issues[0].confidence).toBe('verified');
    expect(issues[0].severity).toBe('critical');
    expect(issues[0].title).toMatch(/^Active credential/);
  });

  it('leaves a dead token as heuristic', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401 }) as Response) as unknown as typeof fetch;
    const issues = [issue({})];
    await verifySecrets(issues, [{ path: 'config.ts', content: `const t = "${token}"` }], fetchImpl);
    expect(issues[0].confidence).toBe('heuristic');
  });

  it('ignores rules without a verifier and never throws on network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    const issues = [issue({ rule: 'secret/aws-access-key' }), issue({})];
    await verifySecrets(issues, [{ path: 'config.ts', content: `const t = "${token}"` }], fetchImpl);
    expect(issues[0].confidence).toBe('heuristic'); // no verifier
    expect(issues[1].confidence).toBe('heuristic'); // network error → unchanged
  });
});
