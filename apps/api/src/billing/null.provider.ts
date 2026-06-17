import type { Plan } from '@riscly/shared';
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

  /** No real session to confirm locally — the dev webhook drives activation. */
  async confirmCheckout(): Promise<BillingEvent | null> {
    return null;
  }

  parseWebhook(rawBody: string): BillingEvent | null {
    try {
      const body = JSON.parse(rawBody) as {
        orgId?: string; plan?: Plan; status?: string; type?: string; eventId?: string;
      };
      if (!body.orgId) return null;
      // A `status` (or explicit type) simulates a subscription change locally.
      if (body.type === 'subscription_updated' || body.status) {
        return {
          type: 'subscription_updated',
          orgId: body.orgId,
          plan: body.plan,
          status: body.status,
          eventId: body.eventId,
        };
      }
      if (!body.plan) return null;
      return { type: 'plan_changed', orgId: body.orgId, plan: body.plan, eventId: body.eventId };
    } catch {
      return null;
    }
  }
}
