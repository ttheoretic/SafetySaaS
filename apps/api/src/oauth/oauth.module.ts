import {
  BadRequestException, Controller, Get, Logger, Module, OnModuleInit, Param,
  Query, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { StoreModule } from '../store/store.module';
import { Auth, AuthContext, Public, RequirePermission } from '../auth/auth-context';
import { OAuthService } from './oauth.service';
import { GithubOAuthProvider } from './github-oauth';

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
  ) {
    if (!projectId) throw new BadRequestException('projectId is required');
    const url = this.oauth.authorizeUrl(provider, {
      orgId: auth.org.id,
      projectId,
      userId: auth.user.id,
    });
    return { url };
  }

  /** Provider redirect target — public (trust comes from the signed state). */
  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) throw new BadRequestException('Missing code/state');
    const result = await this.oauth.handleCallback(provider, code, state);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    res.redirect(
      `${appUrl}/settings?connected=${provider}&project=${result.projectId}`,
    );
  }
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
  }
}
