import { BadRequestException, Injectable } from '@nestjs/common';
import { Store } from '../store/store.module';
import { SecretBox } from '../crypto/secret-box';
import { OAuthProvider } from './oauth-provider';

interface OAuthState {
  orgId: string;
  projectId: string;
  userId: string;
  provider: string;
  exp: number;
}

export interface OAuthStartContext {
  orgId: string;
  projectId: string;
  userId: string;
}

/**
 * Drives the OAuth authorization-code flow.
 *
 * The `state` is an encrypted, expiring envelope (SecretBox) carrying the org /
 * project / user — so the *public* callback can be trusted without an auth
 * header and can't be tampered with or replayed across tenants. On callback the
 * code is exchanged and the resulting token is stored **encrypted** as a
 * project connection, ready for the scanner.
 */
@Injectable()
export class OAuthService {
  private readonly providers = new Map<string, OAuthProvider>();

  constructor(
    private readonly store: Store,
    private readonly secrets: SecretBox,
  ) {}

  register(provider: OAuthProvider) {
    this.providers.set(provider.name, provider);
  }

  private get(name: string): OAuthProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`OAuth provider "${name}" is not configured`);
    }
    return provider;
  }

  private redirectUri(provider: string): string {
    const base = process.env.OAUTH_REDIRECT_BASE ?? 'http://localhost:4000';
    return `${base}/api/oauth/${provider}/callback`;
  }

  authorizeUrl(providerName: string, ctx: OAuthStartContext): string {
    const provider = this.get(providerName);
    const state = this.secrets.encrypt(
      JSON.stringify({
        ...ctx,
        provider: providerName,
        exp: Date.now() + 10 * 60 * 1000,
      } satisfies OAuthState),
    );
    return provider.authorizeUrl(state, this.redirectUri(providerName));
  }

  async handleCallback(providerName: string, code: string, rawState: string) {
    const provider = this.get(providerName);

    let state: OAuthState;
    try {
      state = JSON.parse(this.secrets.decrypt(rawState));
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }
    if (state.provider !== providerName) throw new BadRequestException('State/provider mismatch');
    if (Date.now() > state.exp) throw new BadRequestException('OAuth state expired');

    const result = await provider.exchangeCode(code, this.redirectUri(providerName));

    const connection = await this.store.createConnection({
      orgId: state.orgId,
      projectId: state.projectId,
      provider: providerName,
      status: 'active',
      metadata: result.metadata ?? {},
      encryptedToken: this.secrets.encrypt(result.accessToken),
    });

    return { connectionId: connection.id, orgId: state.orgId, projectId: state.projectId };
  }
}
