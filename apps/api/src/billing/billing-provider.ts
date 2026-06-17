import type { Plan } from '@riscly/shared';

export const BILLING_PROVIDER = Symbol('BILLING_PROVIDER');

export interface CheckoutResult {
  url: string;
}

/** A normalized billing event (a completed checkout or a subscription change). */
export interface BillingEvent {
  /** `plan_changed`: a new/changed plan was purchased (grants access). */
  /** `subscription_updated`: status changed (renewal, past_due, canceled). */
  type: 'plan_changed' | 'subscription_updated';
  orgId: string;
  plan?: Plan;
  /** Raw provider status, e.g. active | trialing | past_due | canceled. */
  status?: string;
  /** Provider event id, used for idempotent processing. */
  eventId?: string;
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
  /**
   * Confirm a completed Checkout Session on return from the provider, so access
   * is granted immediately without waiting for the (async) webhook. Returns a
   * normalized `plan_changed` event when the session is paid, else null.
   */
  confirmCheckout(sessionId: string): Promise<BillingEvent | null>;
}
