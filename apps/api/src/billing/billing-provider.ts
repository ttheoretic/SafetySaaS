import type { Plan } from '@failsafe/shared';

export const BILLING_PROVIDER = Symbol('BILLING_PROVIDER');

export interface CheckoutResult {
  url: string;
}

/** A normalized billing event (e.g. a completed checkout / plan change). */
export interface BillingEvent {
  type: 'plan_changed';
  orgId: string;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Abstraction over the payment provider. The Stripe implementation talks to
 * Stripe; the null implementation handles everything locally so the API runs
 * and is testable without Stripe credentials.
 */
export interface BillingProvider {
  readonly name: string;
  readonly enabled: boolean;
  createCheckout(orgId: string, plan: Plan, email: string): Promise<CheckoutResult>;
  /** Verify + parse an incoming webhook into a normalized event, or null. */
  parseWebhook(rawBody: string, signature?: string): BillingEvent | null;
}
