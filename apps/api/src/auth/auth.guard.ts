import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from './auth-context';
import { verifyToken } from './jwt';
import { AuthService } from './auth.service';

/**
 * Global authentication + tenant-resolution guard.
 *
 * - Skips routes marked @Public().
 * - Verifies the Bearer token (Supabase HS256, or a dev token locally).
 * - Resolves the user and the active organization (from `x-org-id` or the
 *   user's first membership), provisioning on first login.
 * - Attaches `{ user, org, role }` to `req.auth`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    const claims = verifyToken(token, process.env.SUPABASE_JWT_SECRET);
    if (!claims) throw new UnauthorizedException('Invalid or expired token');

    const user = await this.auth.resolveUser(claims);
    const requestedOrgId = req.headers['x-org-id'] as string | undefined;
    const resolved = await this.auth.resolveOrg(user, requestedOrgId);
    if (!resolved) {
      throw new ForbiddenException('No access to the requested organization');
    }

    req.auth = { user, org: resolved.org, role: resolved.role };
    return true;
  }
}
