import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './auth-context';
import { Permission, roleHasPermission } from './roles';

/**
 * RBAC enforcement. Runs after AuthGuard, so `req.auth.role` is set. Routes
 * annotated with @RequirePermission('...') are denied unless the caller's role
 * grants that permission.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const role = req.auth?.role;
    if (!role || !roleHasPermission(role, required)) {
      throw new ForbiddenException(`Requires permission: ${required}`);
    }
    return true;
  }
}
