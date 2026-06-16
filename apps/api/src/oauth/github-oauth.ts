import { OAuthProvider, OAuthExchangeResult } from './oauth-provider';

/**
 * GitHub OAuth (authorization-code flow). Exchanges the callback code for an
 * access token, then discovers the account login and the user's repositories
 * so the connection is immediately scannable. `fetch` is injectable for tests.
 */
export class GithubOAuthProvider implements OAuthProvider {
  readonly name = 'github';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  authorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user repo',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthExchangeResult> {
    const tokenRes = await this.fetchImpl('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenBody = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenBody.access_token) {
      throw new Error(`GitHub token exchange failed: ${tokenBody.error ?? 'no token'}`);
    }
    const accessToken = tokenBody.access_token;

    const headers = {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'riscly',
    };
    const login = await this.safeJson(
      () => this.fetchImpl('https://api.github.com/user', { headers }),
      (b: any) => b?.login as string | undefined,
    );
    const repos = await this.safeJson(
      () => this.fetchImpl('https://api.github.com/user/repos?per_page=50&sort=updated', { headers }),
      (b: any) => (Array.isArray(b) ? b.map((r) => r.full_name).filter(Boolean) : []),
    );

    return {
      accessToken,
      externalAccountId: login,
      metadata: { login, repos: repos ?? [] },
    };
  }

  private async safeJson<T>(
    call: () => Promise<Response>,
    pick: (body: unknown) => T,
  ): Promise<T | undefined> {
    try {
      const res = await call();
      if (!res.ok) return undefined;
      return pick(await res.json());
    } catch {
      return undefined;
    }
  }
}
