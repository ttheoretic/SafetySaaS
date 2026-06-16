/**
 * Paywall helpers shared by the billing guard and the /me endpoint.
 *
 * Enforcement is OFF by default so local dev and the test suite (which run
 * without Stripe) are never blocked. It turns ON automatically once Stripe is
 * configured, or explicitly via REQUIRE_SUBSCRIPTION=true. When enforced, an
 * org can only use the app after it has an active (or trialing) subscription.
 */

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

/** Whether the paywall is enforced in this deployment. */
export function billingEnforced(): boolean {
  return !!process.env.STRIPE_SECRET_KEY || process.env.REQUIRE_SUBSCRIPTION === 'true';
}

/** Whether a subscription status counts as granting access. */
export function isSubscriptionActive(status?: string): boolean {
  return !!status && ACTIVE_STATUSES.has(status);
}

/**
 * Effective access for an org given its subscription status. When the paywall
 * isn't enforced, everyone has access (dev/test); otherwise an active
 * subscription is required.
 */
export function hasAppAccess(status?: string): boolean {
  return !billingEnforced() || isSubscriptionActive(status);
}
