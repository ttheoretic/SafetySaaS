import type { Plan } from '@failsafe/shared';
import { BillingEvent, BillingProvider, CheckoutResult } from './billing-provider';

/**
 * Local billing provider used when no STRIPE_SECRET_KEY is configured. Checkout
 * returns a stub URL, and the webhook accepts a plain `{ orgId, plan }` JSON
 * body so the upgrade flow is exercisable end-to-end in dev and tests.
 */
export class NullBillingProvider implements BillingProvider {
  readonly name = 'none';
  readonly enabled = false;

  async createCheckout(orgId: string, plan: Plan): Promise<CheckoutResult> {
    return { url: `https://billing.local/checkout?org=${orgId}&plan=${plan}` };
  }

  parseWebhook(rawBody: string): BillingEvent | null {
    try {
      const body = JSON.parse(rawBody) as { orgId?: string; plan?: Plan };
      if (!body.orgId || !body.plan) return null;
      return { type: 'plan_changed', orgId: body.orgId, plan: body.plan };
    } catch {
      return null;
    }
  }
}
