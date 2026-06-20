import { Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PLAN_LIMITS, Plan } from '@riscly/shared';
import {
  BillingDetails,
  BillingEvent,
  BillingProvider,
  CheckoutResult,
} from './billing-provider';

/**
 * Stripe-backed billing. Creates Checkout Sessions for plan upgrades and
 * verifies webhook signatures, normalizing completed checkouts / subscription
 * updates into a `plan_changed` event. Plan ⇄ Stripe price mapping comes from
 * STRIPE_PRICE_<PLAN> env vars.
 */
export class StripeBillingProvider implements BillingProvider {
  readonly name = 'stripe';
  readonly enabled = true;
  private readonly logger = new Logger(StripeBillingProvider.name);
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly webhookSecret?: string;

  constructor(secretKey: string, webhookSecret?: string) {
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(orgId: string, plan: Plan, email: string): Promise<CheckoutResult> {
    const price = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
    if (!price) throw new Error(`No Stripe price configured for plan ${plan}`);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      client_reference_id: orgId,
      metadata: { orgId, plan },
      // Stamp the subscription too, so later subscription.* events (renewal,
      // past_due, canceled) can be mapped back to the org without a lookup.
      subscription_data: { metadata: { orgId, plan } },
      // Show the promotion-code field on the hosted checkout page.
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // After paying, continue into onboarding (which sends already-onboarded
      // users straight to the dashboard).
      success_url: `${process.env.APP_URL ?? ''}/get-started?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL ?? ''}/billing?canceled=1`,
    });
    return { url: session.url ?? '' };
  }

  /**
   * Retrieve the Checkout Session by id and, if it's paid, return a
   * `plan_changed` event. Lets the app grant access the moment the user returns
   * from Stripe, independent of webhook delivery/latency.
   */
  async confirmCheckout(sessionId: string): Promise<BillingEvent | null> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      const paid = session.payment_status === 'paid' || session.status === 'complete';
      if (!paid) return null;
      const orgId =
        (session.client_reference_id as string | null) ?? session.metadata?.orgId;
      const plan = session.metadata?.plan as Plan | undefined;
      if (!orgId || !plan || !(plan in PLAN_LIMITS)) return null;
      return {
        type: 'plan_changed',
        orgId,
        plan,
        // Stable, session-scoped id → idempotent even if called twice.
        eventId: `checkout_confirm_${session.id}`,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : undefined,
        stripeSubscriptionId:
          typeof session.subscription === 'string' ? session.subscription : undefined,
      };
    } catch (err) {
      this.logger.warn(`Confirm checkout failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Recent invoices + default card for the Stripe customer. */
  async billingDetails(stripeCustomerId: string): Promise<BillingDetails> {
    const [invoiceList, customer] = await Promise.all([
      this.stripe.invoices.list({ customer: stripeCustomerId, limit: 6 }),
      this.stripe.customers.retrieve(stripeCustomerId, {
        expand: ['invoice_settings.default_payment_method'],
      }),
    ]);

    const invoices = invoiceList.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? undefined,
      date: new Date((inv.created ?? 0) * 1000).toISOString(),
      amount: formatMoney(inv.total ?? 0, inv.currency ?? 'usd'),
      status: inv.status ?? 'open',
      url: inv.hosted_invoice_url ?? inv.invoice_pdf ?? undefined,
    }));

    let paymentMethod = null as BillingDetails['paymentMethod'];
    // Structural shape avoids the SDK's namespace types (which vary by version).
    const cust = customer as {
      deleted?: boolean;
      invoice_settings?: {
        default_payment_method?:
          | string
          | {
              card?: {
                brand: string;
                last4: string;
                exp_month: number;
                exp_year: number;
              };
            }
          | null;
      };
    };
    const pm = cust?.deleted
      ? null
      : cust?.invoice_settings?.default_payment_method;
    if (pm && typeof pm !== 'string' && pm.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    }

    return { invoices, paymentMethod };
  }

  parseWebhook(rawBody: string, signature?: string): BillingEvent | null {
    // We only read a few fields, so a minimal shape keeps us decoupled from the
    // SDK's deep generic event types.
    type CheckoutEvent = {
      id?: string;
      type: string;
      data: {
        object: {
          id?: string;
          status?: string;
          client_reference_id?: string;
          metadata?: { orgId?: string; plan?: string };
          customer?: string;
          subscription?: string;
        };
      };
    };
    let event: CheckoutEvent;
    try {
      if (this.webhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(
          rawBody, signature, this.webhookSecret,
        ) as unknown as CheckoutEvent;
      } else {
        event = JSON.parse(rawBody) as CheckoutEvent;
      }
    } catch (err) {
      this.logger.warn(`Invalid Stripe webhook: ${(err as Error).message}`);
      return null;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orgId = session.client_reference_id ?? session.metadata?.orgId;
      const plan = session.metadata?.plan as Plan | undefined;
      if (!orgId || !plan || !(plan in PLAN_LIMITS)) return null;
      return {
        type: 'plan_changed',
        orgId,
        plan,
        eventId: event.id,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      };
    }

    // Renewals, cancellations and payment failures update access. The org id
    // travels on the subscription metadata we set at checkout.
    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      if (!orgId) return null;
      const plan = sub.metadata?.plan as Plan | undefined;
      // A deleted subscription is canceled regardless of the object's status.
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
      return {
        type: 'subscription_updated',
        orgId,
        plan: plan && plan in PLAN_LIMITS ? plan : undefined,
        status,
        eventId: event.id,
        stripeCustomerId: sub.customer,
        stripeSubscriptionId: sub.id,
      };
    }
    return null;
  }
}

/** Format a Stripe minor-unit amount (cents) as a currency string. */
function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
