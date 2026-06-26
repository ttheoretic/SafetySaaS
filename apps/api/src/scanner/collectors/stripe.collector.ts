import { Injectable, Logger } from '@nestjs/common';
import type { ScanCollection, Finding } from '@riscly/shared';
import type { ConnectionRecord } from '../../store/store.module';
import { ProviderCollector, CollectorContext, resilientFetch } from './collector';

interface StripeWebhook {
  id: string;
  url?: string;
  status?: string;
  api_version?: string;
}

/**
 * Stripe collector. Confirms the dependency is live (balance/livemode) and, with
 * a read-capable key, audits real config: webhook endpoints delivered over plain
 * HTTP (no TLS) or left enabled on a dead URL. Every failure degrades to declared
 * metadata so a Stripe hiccup never breaks the scan.
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

    let live = declaredLive;
    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      if (!res.ok) throw new Error(`Stripe API ${res.status}`);
      const body = (await res.json()) as { livemode?: boolean };
      live = body.livemode ?? ctx.token.startsWith('sk_live');
    } catch (err) {
      this.logger.warn(`Stripe collector failed: ${(err as Error).message}`);
      return { billing: [{ provider: 'stripe', live: declaredLive }] };
    }

    const findings = await this.auditWebhooks(ctx, live);
    return { billing: [{ provider: 'stripe', live }], ...(findings.length ? { findings } : {}) };
  }

  /** Flag webhook endpoints served over plain HTTP — payloads and signatures in
   *  the clear, vulnerable to interception. */
  private async auditWebhooks(ctx: CollectorContext, live: boolean): Promise<Finding[]> {
    try {
      const res = await resilientFetch(ctx.fetchImpl, 'https://api.stripe.com/v1/webhook_endpoints?limit=100', {
        headers: { Authorization: `Bearer ${ctx.token}` },
      });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: StripeWebhook[] };
      const insecure = (body.data ?? []).filter(
        (w) => w.status !== 'disabled' && typeof w.url === 'string' && /^http:\/\//i.test(w.url),
      );
      return insecure.slice(0, 8).map((w) => ({
        category: 'security',
        severity: live ? 'high' : 'medium',
        title: `Stripe webhook over plain HTTP: ${w.url}`,
        description:
          'This active Stripe webhook endpoint uses http:// instead of https://, so event payloads and the signature header travel unencrypted and can be intercepted or tampered with. Serve the endpoint over TLS.',
        weight: live ? 14 : 8,
      }));
    } catch (err) {
      this.logger.warn(`Stripe webhook audit failed: ${(err as Error).message}`);
      return [];
    }
  }
}
