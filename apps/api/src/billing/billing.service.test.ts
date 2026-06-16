import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../store/store.module';
import { BillingService } from './billing.service';
import { NullBillingProvider } from './null.provider';
import { isSubscriptionActive } from './subscription';

describe('BillingService.applyEvent (subscription lifecycle)', () => {
  let store: InMemoryStore;
  let billing: BillingService;
  let orgId: string;

  beforeEach(async () => {
    store = new InMemoryStore();
    billing = new BillingService(store, new NullBillingProvider());
    const org = await store.createOrganization({ name: 'Acme', slug: 'acme', plan: 'starter' });
    orgId = org.id;
  });

  it('grants access and sets the plan on checkout', async () => {
    await billing.applyEvent({ type: 'plan_changed', orgId, plan: 'growth', eventId: 'e1' });
    const sub = await store.getSubscription(orgId);
    expect(sub?.status).toBe('active');
    expect(isSubscriptionActive(sub?.status)).toBe(true);
    expect((await store.getOrganization(orgId))?.plan).toBe('growth');
  });

  it('revokes access when the subscription is canceled', async () => {
    await billing.applyEvent({ type: 'plan_changed', orgId, plan: 'growth', eventId: 'e1' });
    await billing.applyEvent({ type: 'subscription_updated', orgId, status: 'canceled', eventId: 'e2' });
    const sub = await store.getSubscription(orgId);
    expect(sub?.status).toBe('canceled');
    expect(isSubscriptionActive(sub?.status)).toBe(false);
    // The plan tier is preserved (not reset) so a re-subscribe keeps the tier.
    expect(sub?.plan).toBe('growth');
  });

  it('revokes access on a past_due status', async () => {
    await billing.applyEvent({ type: 'plan_changed', orgId, plan: 'pro', eventId: 'e1' });
    await billing.applyEvent({ type: 'subscription_updated', orgId, status: 'past_due', eventId: 'e2' });
    expect(isSubscriptionActive((await store.getSubscription(orgId))?.status)).toBe(false);
  });

  it('is idempotent on repeated event ids', async () => {
    const first = await billing.applyEvent({ type: 'plan_changed', orgId, plan: 'growth', eventId: 'dup' });
    const second = await billing.applyEvent({ type: 'plan_changed', orgId, plan: 'growth', eventId: 'dup' });
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
