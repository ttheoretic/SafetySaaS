import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface StripeAdminSummary {
  connected: boolean;
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trials: number;
  canceledLast30d: number;
  refundsLast30d: { count: number; amount: number };
  failedPaymentsLast30d: number;
  currency: string;
  invoices: Array<{
    id: string;
    customer: string | null;
    amount: number;
    status: string;
    created: string;
    url: string | null;
  }>;
}

/** Just the invoice fields we read (avoids depending on the SDK namespace). */
interface StripeInvoiceLike {
  id: string;
  customer_email?: string | null;
  customer?: unknown;
  amount_paid?: number | null;
  amount_due?: number | null;
  status?: string | null;
  created?: number;
  hosted_invoice_url?: string | null;
}

interface CouponLike {
  percent_off?: number | null;
  amount_off?: number | null;
  duration?: string | null;
}

/** Pull the coupon off a discount holder's `discount` (single, deprecated) or
 *  `discounts` (array, current) field, whichever is populated and expanded. */
function couponFrom(holder: unknown): CouponLike | null {
  const h = holder as {
    discount?: { coupon?: CouponLike } | null;
    discounts?: Array<{ coupon?: CouponLike } | string> | null;
  } | null;
  if (!h) return null;
  const fromArray = Array.isArray(h.discounts)
    ? h.discounts.find((d): d is { coupon?: CouponLike } => typeof d === 'object' && d !== null && Boolean(d.coupon))
    : undefined;
  const disc = h.discount ?? fromArray ?? null;
  return disc?.coupon ?? null;
}

/** The coupon currently reducing what a subscription actually bills. A coupon
 *  may sit on the subscription OR on the customer (checkout often attaches it to
 *  the customer), so we check both. Any still-attached coupon — including a
 *  one-time ('once') one that hasn't been consumed yet — reduces the amount the
 *  customer is billed right now, so it counts toward MRR. A 100%-off coupon
 *  therefore zeroes the subscription's contribution. */
function activeCoupon(sub: unknown): CouponLike | null {
  const s = sub as { customer?: unknown };
  return couponFrom(sub) ?? couponFrom(s.customer) ?? null;
}

/** Reduce a monthly amount (cents) by an active coupon. */
function applyDiscount(monthlyCents: number, coupon: CouponLike | null): number {
  if (!coupon) return monthlyCents;
  if (coupon.percent_off) return monthlyCents * (1 - coupon.percent_off / 100);
  if (coupon.amount_off) return Math.max(0, monthlyCents - coupon.amount_off);
  return monthlyCents;
}

function toMonthly(amountCents: number, interval?: string, count = 1): number {
  switch (interval) {
    case 'year': return amountCents / (12 * count);
    case 'week': return (amountCents * 52) / (12 * count);
    case 'day': return (amountCents * 365) / (12 * count);
    default: return amountCents / count;
  }
}

/**
 * Reads Riscly's OWN Stripe account (the platform secret key) for the admin
 * Billing page: real MRR, refunds, failed payments and recent invoices. Fully
 * optional — without STRIPE_SECRET_KEY everything reports connected:false and
 * the admin page falls back to plan-derived numbers. Resilient: any failure
 * degrades to connected:false rather than breaking the request.
 */
@Injectable()
export class AdminStripeService {
  private readonly logger = new Logger(AdminStripeService.name);
  private readonly stripe: InstanceType<typeof Stripe> | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key) : null;
  }

  get enabled(): boolean {
    return Boolean(this.stripe);
  }

  /** List subscriptions with coupon data expanded so 100%-off (and partial)
   *  coupons are reflected in MRR. Coupons can live on the subscription
   *  (`discounts`) or on the customer, so we expand both. If a particular
   *  account/API version rejects the expand, fall back to an unexpanded list
   *  rather than failing the whole summary (which would silently revert MRR to
   *  full plan price). */
  private async listSubscriptions(
    stripe: InstanceType<typeof Stripe>,
  ): Promise<Awaited<ReturnType<InstanceType<typeof Stripe>['subscriptions']['list']>>> {
    try {
      return await stripe.subscriptions.list({
        status: 'all',
        limit: 100,
        expand: ['data.discounts', 'data.customer'],
      });
    } catch (err) {
      this.logger.warn(`Stripe subscription expand failed, retrying plain: ${(err as Error).message}`);
      return stripe.subscriptions.list({ status: 'all', limit: 100 });
    }
  }

  async summary(): Promise<StripeAdminSummary | null> {
    if (!this.stripe) return null;
    const stripe = this.stripe;
    const since = Math.floor((Date.now() - 30 * 86400_000) / 1000);
    try {
      const [subs, refunds, charges, invoices] = await Promise.all([
        this.listSubscriptions(stripe),
        stripe.refunds.list({ limit: 100, created: { gte: since } }),
        stripe.charges.list({ limit: 100, created: { gte: since } }),
        stripe.invoices.list({ limit: 10 }),
      ]);

      let mrrCents = 0;
      let currency = 'usd';
      let active = 0;
      let trials = 0;
      let canceled = 0;
      for (const s of subs.data) {
        if (s.status === 'active' || s.status === 'past_due') active++;
        if (s.status === 'trialing') trials++;
        if (s.status === 'canceled' && (s.canceled_at ?? 0) >= since) canceled++;
        if (s.status === 'active' || s.status === 'trialing' || s.status === 'past_due') {
          let subMonthlyCents = 0;
          for (const item of s.items.data) {
            const p = item.price;
            if (!p?.unit_amount || !p.recurring) continue;
            currency = p.currency ?? currency;
            subMonthlyCents += toMonthly(
              p.unit_amount * (item.quantity ?? 1),
              p.recurring.interval,
              p.recurring.interval_count ?? 1,
            );
          }
          // Apply the coupon currently attached to the subscription or its
          // customer (percent_off / amount_off). A 100%-off coupon therefore
          // contributes 0 to MRR.
          mrrCents += applyDiscount(subMonthlyCents, activeCoupon(s));
        }
      }

      const refundAmount = refunds.data.reduce((a, r) => a + (r.amount ?? 0), 0);
      const failed = charges.data.filter((c) => c.status === 'failed').length;

      return {
        connected: true,
        mrr: Math.round(mrrCents / 100),
        arr: Math.round((mrrCents / 100) * 12),
        activeSubscriptions: active,
        trials,
        canceledLast30d: canceled,
        refundsLast30d: { count: refunds.data.length, amount: Math.round(refundAmount / 100) },
        failedPaymentsLast30d: failed,
        currency: currency.toUpperCase(),
        invoices: (invoices.data as StripeInvoiceLike[]).map((inv) => ({
          id: inv.id,
          customer: inv.customer_email ?? (typeof inv.customer === 'string' ? inv.customer : null),
          amount: Math.round((inv.amount_paid ?? inv.amount_due ?? 0) / 100),
          status: inv.status ?? 'unknown',
          created: new Date((inv.created ?? 0) * 1000).toISOString(),
          url: inv.hosted_invoice_url ?? null,
        })),
      };
    } catch (err) {
      this.logger.warn(`Stripe admin summary failed: ${(err as Error).message}`);
      return null;
    }
  }
}
