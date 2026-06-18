import { OAuthProvider, OAuthExchangeResult } from './oauth-provider';

export interface OAuth2Config {
  /** Provider id, e.g. 'gitlab'. */
  name: string;
  authorizeEndpoint: string;
  tokenEndpoint: string;
  scope: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Config-driven OAuth 2.0 authorization-code provider. Most providers
 * (GitLab, Bitbucket, Vercel, …) follow the standard code→token exchange, so
 * adding one is just a config entry plus client credentials — no new class.
 * Provider-specific discovery (listing repos/projects) is intentionally left to
 * that provider's scanner collector, keeping this exchange generic.
 */
export class GenericOAuth2Provider implements OAuthProvider {
  readonly name: string;

  constructor(
    private readonly config: OAuth2Config,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.name = config.name;
  }

  authorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scope,
      state,
    });
    return `${this.config.authorizeEndpoint}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthExchangeResult> {
    const res = await this.fetchImpl(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });
    const body = (await res.json()) as { access_token?: string; error?: string };
    if (!body.access_token) {
      throw new Error(`${this.name} token exchange failed: ${body.error ?? 'no token'}`);
    }
    return { accessToken: body.access_token, metadata: {} };
  }
}

/** Standard OAuth2 endpoints for the providers we can enable via env vars. */
export const OAUTH2_PROVIDERS: Omit<OAuth2Config, 'clientId' | 'clientSecret'>[] = [
  {
    name: 'gitlab',
    authorizeEndpoint: 'https://gitlab.com/oauth/authorize',
    tokenEndpoint: 'https://gitlab.com/oauth/token',
    scope: 'read_api read_repository',
  },
  {
    name: 'bitbucket',
    authorizeEndpoint: 'https://bitbucket.org/site/oauth2/authorize',
    tokenEndpoint: 'https://bitbucket.org/site/oauth2/access_token',
    scope: 'repository account',
  },
  {
    name: 'vercel',
    authorizeEndpoint: 'https://vercel.com/oauth/authorize',
    tokenEndpoint: 'https://api.vercel.com/v2/oauth/access_token',
    scope: 'read',
  },
];
