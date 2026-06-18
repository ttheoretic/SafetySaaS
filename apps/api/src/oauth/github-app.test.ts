import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  createAppJwt,
  githubAppConfig,
  isGithubAppConfigured,
  githubAppInstallUrl,
  mintInstallationToken,
  listInstallationRepos,
} from './github-app';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
const cfg = { appId: '12345', slug: 'riscly-scanner', privateKey: PEM };

describe('github-app config', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD }; });
  afterEach(() => { process.env = OLD; });

  it('is disabled without env vars', () => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_SLUG;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    expect(isGithubAppConfigured()).toBe(false);
    expect(githubAppConfig()).toBeNull();
  });

  it('restores literal \\n in the private key from env', () => {
    process.env.GITHUB_APP_ID = '1';
    process.env.GITHUB_APP_SLUG = 'app';
    process.env.GITHUB_APP_PRIVATE_KEY = 'line1\\nline2';
    expect(githubAppConfig()?.privateKey).toBe('line1\nline2');
  });
});

describe('createAppJwt', () => {
  it('produces a verifiable RS256 JWT issued by the app id', () => {
    const jwt = createAppJwt(cfg);
    const [header, payload, signature] = jwt.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toMatchObject({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toMatchObject({ iss: '12345' });

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  });
});

describe('githubAppInstallUrl', () => {
  it('points at the app installations/new screen with the state', () => {
    const url = githubAppInstallUrl('STATE123', cfg);
    expect(url).toBe('https://github.com/apps/riscly-scanner/installations/new?state=STATE123');
  });
});

describe('installation token + repos', () => {
  it('mints an installation token, then lists only the granted repos', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/access_tokens')) {
        return { ok: true, json: async () => ({ token: 'ghs_install_tok' }) } as Response;
      }
      if (String(url).includes('/installation/repositories')) {
        return {
          ok: true,
          json: async () => ({ repositories: [{ full_name: 'acme/web' }, { full_name: 'acme/api' }] }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    }) as unknown as typeof fetch;

    const token = await mintInstallationToken('999', fetchImpl, cfg);
    expect(token).toBe('ghs_install_tok');

    const repos = await listInstallationRepos('999', fetchImpl, cfg);
    expect(repos).toEqual(['acme/web', 'acme/api']);
  });
});
