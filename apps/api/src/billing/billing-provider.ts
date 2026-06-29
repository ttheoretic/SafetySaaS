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
  /**
   * Recent invoices and the default payment method for a customer. Optional —
   * providers that can't surface this (the local provider) omit it.
   */
  billingDetails?(stripeCustomerId: string): Promise<BillingDetails>;
  /**
   * Create a customer-portal session so the user can manage their subscription
   * (change plan, update card, cancel). Optional — only the Stripe provider.
   */
  createPortalSession?(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }>;
}

/** A past invoice for the billing customer. */
export interface BillingInvoice {
  id: string;
  number?: string;
  /** ISO timestamp of when the invoice was created. */
  date: string;
  /** Pre-formatted amount with currency, e.g. "$499.00". */
  amount: string;
  status: string;
  /** Hosted invoice page or PDF, when available. */
  url?: string;
}

/** The default card on file for the billing customer. */
export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface BillingDetails {
  invoices: BillingInvoice[];
  paymentMethod: PaymentMethodInfo | null;
}
