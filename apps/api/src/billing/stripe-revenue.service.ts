import { Injectable, Logger } from '@nestjs/common';

export interface StripeMrr {
  /** Monthly recurring revenue in whole currency units (e.g. euros). */
  monthlyRevenue: number;
  currency: string;
  /** Active subscriptions — a proxy for active paying users. */
  activeUsers: number;
}

interface StripePrice {
  unit_amount?: number;
  currency?: string;
  recurring?: { interval?: string; interval_count?: number };
}
interface StripeSubscription {
  items?: { data?: { price?: StripePrice; quantity?: number }[] };
}

/** Normalize a recurring amount (in cents) to a monthly amount (in cents). */
function toMonthly(amountCents: number, recurring?: StripePrice['recurring']): number {
  const count = recurring?.interval_count ?? 1;
  switch (recurring?.interval) {
    case 'year': return amountCents / (12 * count);
    case 'week': return (amountCents * 52) / (12 * count);
    case 'day': return (amountCents * 365) / (12 * count);
    case 'month':
    default: return amountCents / count;
  }
}

/**
 * Reads a customer's *connected* Stripe account (their own secret key) to
 * estimate live MRR and active subscriptions. Decoupled from the system scan —
 * used only to suggest business-context numbers. Resilient: returns null on any
 * failure so it can never break a request.
 */
@Injectable()
export class StripeRevenueService {
  private readonly logger = new Logger(StripeRevenueService.name);

  async fetchMrr(token: string, fetchImpl: typeof fetch = fetch): Promise<StripeMrr | null> {
    try {
      const url = new URL('https://api.stripe.com/v1/subscriptions');
      url.searchParams.set('status', 'active');
      url.searchParams.set('limit', '100');
      const res = await fetchImpl(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Stripe API ${res.status}`);
      const body = (await res.json()) as { data?: StripeSubscription[] };
      const subs = body.data ?? [];

      let monthlyCents = 0;
      let currency = 'eur';
      for (const sub of subs) {
        for (const item of sub.items?.data ?? []) {
          const price = item.price;
          if (!price?.unit_amount || !price.recurring) continue;
          currency = price.currency ?? currency;
          monthlyCents += toMonthly(price.unit_amount * (item.quantity ?? 1), price.recurring);
        }
      }

      return {
        monthlyRevenue: Math.round(monthlyCents / 100),
        currency: currency.toUpperCase(),
        activeUsers: subs.length,
      };
    } catch (err) {
      this.logger.warn(`Stripe MRR fetch failed: ${(err as Error).message}`);
      return null;
    }
  }
}
