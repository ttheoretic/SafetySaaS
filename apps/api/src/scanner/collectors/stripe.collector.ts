import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext } from './collector';

/**
 * Confirms the Stripe dependency is live. With a secret key it calls the Stripe
 * API (balance) to verify connectivity and read livemode; without one it
 * trusts the connection metadata. Always resilient — any failure degrades to
 * the declared metadata so a Stripe outage never breaks the scan itself.
 */
@Injectable()
export class StripeCollector implements ProviderCollector {
  readonly provider = 'stripe';
  private readonly logger = new Logger(StripeCollector.name);

  async collect(connection: ConnectionRecord, ctx: CollectorContext): Promise<Partial<ScanCollection>> {
    const meta = connection.metadata ?? {};
    const declaredLive = meta.live !== false;

    if (!ctx.token) {
      return { billing: [{ provider: 'stripe', live: declaredLive }] };
    }

    try {
      const res = await ctx.fetchImpl('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      if (!res.ok) throw new Error(`Stripe API ${res.status}`);
      const body = (await res.json()) as { livemode?: boolean };
      const live = body.livemode ?? ctx.token.startsWith('sk_live');
      return { billing: [{ provider: 'stripe', live }] };
    } catch (err) {
      this.logger.warn(`Stripe collector failed: ${(err as Error).message}`);
      return { billing: [{ provider: 'stripe', live: declaredLive }] };
    }
  }
}
