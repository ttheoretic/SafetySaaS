import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { OAuthService } from './oauth.service';
import { OAuthProvider } from './oauth-provider';
import { GithubOAuthProvider } from './github-oauth';
import { SecretBox } from '../crypto/secret-box';
import { InMemoryStore } from '../store/store.module';

const KEY = randomBytes(32).toString('base64');

class FakeProvider implements OAuthProvider {
  readonly name = 'github';
  authorizeUrl(state: string, redirectUri: string): string {
    return `https://provider/authorize?state=${encodeURIComponent(state)}&redirect=${encodeURIComponent(redirectUri)}`;
  }
  async exchangeCode() {
    return {
      accessToken: 'tok_secret_123',
      externalAccountId: 'octocat',
      metadata: { login: 'octocat', repos: ['octocat/app'] },
    };
  }
}

function makeService() {
  const store = new InMemoryStore();
  const secrets = new SecretBox(KEY);
  const service = new OAuthService(store, secrets);
  service.register(new FakeProvider());
  return { service, store, secrets };
}

describe('OAuthService', () => {
  it('builds an authorize URL carrying an encrypted state', () => {
    const { service } = makeService();
    const url = service.authorizeUrl('github', {
      orgId: 'org1', projectId: 'proj1', userId: 'user1',
    });
    expect(url).toContain('https://provider/authorize');
    expect(url).toContain('state=');
  });

  it('rejects an unconfigured provider', () => {
    const { service } = makeService();
    expect(() => service.authorizeUrl('gitlab', { orgId: 'o', projectId: 'p', userId: 'u' }))
      .toThrow(/not configured/);
  });

  it('completes the callback and stores an ENCRYPTED token connection', async () => {
    const { service, store, secrets } = makeService();
    const url = service.authorizeUrl('github', {
      orgId: 'org1', projectId: 'proj1', userId: 'user1',
    });
    const state = new URL(url).searchParams.get('state')!;

    const result = await service.handleCallback('github', 'code123', state);
    expect(result.projectId).toBe('proj1');

    const connections = await store.listConnections('proj1');
    expect(connections).toHaveLength(1);
    const conn = connections[0];
    expect(conn.provider).toBe('github');
    // Token is stored encrypted, never in plaintext.
    expect(conn.encryptedToken).toBeDefined();
    expect(conn.encryptedToken).not.toContain('tok_secret_123');
    expect(secrets.decrypt(conn.encryptedToken!)).toBe('tok_secret_123');
    expect((conn.metadata as any).repos).toEqual(['octocat/app']);
  });

  it('rejects a tampered or foreign state', async () => {
    const { service } = makeService();
    await expect(service.handleCallback('github', 'code', 'not-a-valid-state'))
      .rejects.toThrow(/Invalid OAuth state/);
  });

  it('rejects an expired state', async () => {
    const store = new InMemoryStore();
    const secrets = new SecretBox(KEY);
    const service = new OAuthService(store, secrets);
    service.register(new FakeProvider());
    const expired = secrets.encrypt(JSON.stringify({
      orgId: 'o', projectId: 'p', userId: 'u', provider: 'github', exp: 1,
    }));
    await expect(service.handleCallback('github', 'code', expired))
      .rejects.toThrow(/expired/);
  });
});

describe('GithubOAuthProvider (mocked fetch)', () => {
  it('exchanges a code for a token and discovers login + repos', async () => {
    const fetchImpl = (async (url: string) => {
      if (String(url).includes('access_token')) {
        return { ok: true, json: async () => ({ access_token: 'gho_abc' }) } as Response;
      }
      if (String(url).endsWith('/user')) {
        return { ok: true, json: async () => ({ login: 'octocat' }) } as Response;
      }
      if (String(url).includes('/user/repos')) {
        return { ok: true, json: async () => [{ full_name: 'octocat/app' }] } as Response;
      }
      return { ok: false } as Response;
    }) as unknown as typeof fetch;

    const provider = new GithubOAuthProvider('id', 'secret', fetchImpl);
    const result = await provider.exchangeCode('code', 'https://cb');
    expect(result.accessToken).toBe('gho_abc');
    expect(result.externalAccountId).toBe('octocat');
    expect((result.metadata as any).repos).toEqual(['octocat/app']);
  });

  it('throws when GitHub returns no token', async () => {
    const fetchImpl = (async () =>
      ({ ok: true, json: async () => ({ error: 'bad_verification_code' }) }) as Response) as unknown as typeof fetch;
    const provider = new GithubOAuthProvider('id', 'secret', fetchImpl);
    await expect(provider.exchangeCode('bad', 'https://cb')).rejects.toThrow(/token exchange failed/);
  });
});
