import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role, UserRecord, OrganizationRecord } from '../store/store.module';
import type { Permission } from './roles';

/** Resolved per-request identity + active tenant, attached by AuthGuard. */
export interface AuthContext {
  user: UserRecord;
  org: OrganizationRecord;
  role: Role;
}

export const PUBLIC_KEY = 'isPublic';
/** Mark a route as not requiring authentication. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const PERMISSION_KEY = 'requiredPermission';
/** Require an RBAC permission for a route (enforced by PermissionsGuard). */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

export const ALLOW_NO_SUBSCRIPTION_KEY = 'allowNoSubscription';
/**
 * Exempt a route/controller from the paywall (SubscriptionGuard). Used for the
 * endpoints needed to *reach* and *complete* checkout: /me, billing and OAuth.
 */
export const AllowWithoutSubscription = () =>
  SetMetadata(ALLOW_NO_SUBSCRIPTION_KEY, true);

/** Inject the resolved AuthContext into a handler parameter. */
export const Auth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.auth as AuthContext;
  },
);
