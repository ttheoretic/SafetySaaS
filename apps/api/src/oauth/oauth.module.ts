import {
  BadRequestException, Controller, Get, Logger, Module, OnModuleInit, Param,
  Query, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { StoreModule } from '../store/store.module';
import {
  AllowWithoutSubscription, Auth, AuthContext, Public, RequirePermission,
} from '../auth/auth-context';
import { OAuthService } from './oauth.service';
import { GithubOAuthProvider } from './github-oauth';
import { GenericOAuth2Provider, OAUTH2_PROVIDERS } from './generic-oauth2';
import { isGithubAppConfigured } from './github-app';

// Connecting a stack is part of onboarding, before the dashboard is unlocked.
@AllowWithoutSubscription()
@Controller('oauth')
class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  /** Begin the flow — returns the provider authorization URL to redirect to. */
  @Get(':provider/authorize')
  @RequirePermission('connection:write')
  authorize(
    @Auth() auth: AuthContext,
    @Param('provider') provider: string,
    @Query('projectId') projectId: string,
    @Query('next') next?: string,
  ) {
    if (!projectId) throw new BadRequestException('projectId is required');
    const ctx = {
      orgId: auth.org.id,
      projectId,
      userId: auth.user.id,
      next: safeNext(next),
    };
    // Prefer the GitHub App when configured — it gives the native repo-selection
    // screen and scoped, short-lived tokens instead of a broad OAuth token.
    const url =
      provider === 'github' && isGithubAppConfigured()
        ? this.oauth.githubAppInstallUrl(ctx)
        : this.oauth.authorizeUrl(provider, ctx);
    return { url };
  }

  /** Provider redirect target — public (trust comes from the signed state). */
  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('installation_id') installationId: string,
    @Res() res: Response,
  ) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    try {
      // GitHub App installs return an installation_id (no code) — handle that
      // path first; otherwise fall back to the OAuth authorization-code exchange.
      const result =
        provider === 'github' && installationId
          ? await this.oauth.handleGithubAppInstall(installationId, state)
          : await this.exchangeOAuthCode(provider, code, state);
      const dest = safeNext(result.next) ?? '/settings';
      res.redirect(
        `${appUrl}${dest}?connected=${provider}&project=${result.projectId}`,
      );
    } catch {
      // The flow was abandoned or the signed state expired (e.g. the user took a
      // long detour on the provider, like a password reset). Don't dump a raw
      // 400 JSON on them — send them back into onboarding to retry.
      res.redirect(`${appUrl}/get-started?connect_error=${provider}`);
    }
  }

  private exchangeOAuthCode(provider: string, code: string, state: string) {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    return this.oauth.handleCallback(provider, code, state);
  }
}

/**
 * Whitelist the post-OAuth return path to our own known in-app destinations,
 * so the `next` param can never be abused as an open redirect.
 */
function safeNext(next?: string): string | undefined {
  const allowed = ['/settings', '/get-started'];
  return next && allowed.includes(next) ? next : undefined;
}

@Module({
  imports: [StoreModule],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule implements OnModuleInit {
  constructor(private readonly oauth: OAuthService) {}

  onModuleInit() {
    const id = process.env.GITHUB_CLIENT_ID;
    const secret = process.env.GITHUB_CLIENT_SECRET;
    if (id && secret) {
      this.oauth.register(new GithubOAuthProvider(id, secret));
      Logger.log('OAuth: GitHub provider registered.', 'OAuthModule');
    } else {
      Logger.log('OAuth: GITHUB_CLIENT_ID/SECRET not set — GitHub OAuth disabled.', 'OAuthModule');
    }

    // Config-driven OAuth2 providers — enabled per-provider when their
    // <PROVIDER>_CLIENT_ID / _CLIENT_SECRET env vars are present.
    for (const cfg of OAUTH2_PROVIDERS) {
      const envKey = cfg.name.toUpperCase();
      const clientId = process.env[`${envKey}_CLIENT_ID`];
      const clientSecret = process.env[`${envKey}_CLIENT_SECRET`];
      if (clientId && clientSecret) {
        this.oauth.register(new GenericOAuth2Provider({ ...cfg, clientId, clientSecret }));
        Logger.log(`OAuth: ${cfg.name} provider registered.`, 'OAuthModule');
      }
    }
  }
}
