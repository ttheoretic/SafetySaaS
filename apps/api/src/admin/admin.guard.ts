import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context';

/**
 * Gates the internal admin console: only platform staff (User.platformAdmin)
 * may pass. Runs after the global AuthGuard, which has already attached
 * `req.auth`. Every /admin endpoint is server-side protected by this guard, so
 * the console can never be reached by a normal customer even if they craft the
 * request directly.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.auth as AuthContext | undefined;
    if (!auth?.platformAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
