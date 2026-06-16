import {
  CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Store } from '../store/store.module';
import { ALLOW_NO_SUBSCRIPTION_KEY, PUBLIC_KEY } from '../auth/auth-context';
import { billingEnforced, isSubscriptionActive } from './subscription';

/**
 * Paywall enforcement. Runs after AuthGuard (so `req.auth` is set). When the
 * paywall is enforced (Stripe configured), every tenant route requires an
 * active subscription — except @Public() routes and those marked
 * @AllowWithoutSubscription() (/me, /billing, /oauth), which the user needs to
 * reach and complete checkout. Otherwise it responds 402 Payment Required.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: Store,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!billingEnforced()) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_NO_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    const req = context.switchToHttp().getRequest();
    const orgId: string | undefined = req.auth?.org?.id;
    if (!orgId) return true; // no resolved tenant (e.g. health) — nothing to gate

    const sub = await this.store.getSubscription(orgId);
    if (isSubscriptionActive(sub?.status)) return true;

    throw new HttpException(
      'No active subscription for this workspace. Choose a plan to continue.',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
