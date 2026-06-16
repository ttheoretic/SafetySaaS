import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionGuard } from './subscription.guard';
import { ALLOW_NO_SUBSCRIPTION_KEY, PUBLIC_KEY } from '../auth/auth-context';

/** Minimal ExecutionContext stub carrying a request with `auth`. */
function ctx(orgId?: string) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ auth: orgId ? { org: { id: orgId } } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function guardWith(opts: { status?: string; allow?: boolean; isPublic?: boolean }) {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === ALLOW_NO_SUBSCRIPTION_KEY ? opts.allow : key === PUBLIC_KEY ? opts.isPublic : undefined,
  } as unknown as Reflector;
  const store = { getSubscription: vi.fn().mockResolvedValue(opts.status ? { status: opts.status } : undefined) } as any;
  return new SubscriptionGuard(reflector, store);
}

describe('SubscriptionGuard (paywall)', () => {
  const prev = process.env.REQUIRE_SUBSCRIPTION;
  beforeEach(() => { process.env.REQUIRE_SUBSCRIPTION = 'true'; delete process.env.STRIPE_SECRET_KEY; });
  afterEach(() => { process.env.REQUIRE_SUBSCRIPTION = prev; });

  it('allows everything when enforcement is off', async () => {
    process.env.REQUIRE_SUBSCRIPTION = 'false';
    expect(await guardWith({}).canActivate(ctx('org1'))).toBe(true);
  });

  it('blocks with 402 when no active subscription', async () => {
    try {
      await guardWith({ status: undefined }).canActivate(ctx('org1'));
      throw new Error('expected 402');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(402);
    }
  });

  it('blocks a canceled subscription', async () => {
    await expect(guardWith({ status: 'canceled' }).canActivate(ctx('org1'))).rejects.toBeInstanceOf(HttpException);
  });

  it('allows an active subscription', async () => {
    expect(await guardWith({ status: 'active' }).canActivate(ctx('org1'))).toBe(true);
  });

  it('allows trialing subscriptions', async () => {
    expect(await guardWith({ status: 'trialing' }).canActivate(ctx('org1'))).toBe(true);
  });

  it('exempts @AllowWithoutSubscription routes (billing/me/oauth)', async () => {
    expect(await guardWith({ allow: true }).canActivate(ctx('org1'))).toBe(true);
  });

  it('exempts @Public routes', async () => {
    expect(await guardWith({ isPublic: true }).canActivate(ctx())).toBe(true);
  });
});
