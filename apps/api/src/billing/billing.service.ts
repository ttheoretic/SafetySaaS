import {
  ForbiddenException, HttpException, HttpStatus, Inject, Injectable,
} from '@nestjs/common';
import { planLimits, Plan, PlanLimits, Feature, hasFeature } from '@riscly/shared';
import { Store, OrganizationRecord } from '../store/store.module';
import {
  BILLING_PROVIDER,
  BillingProvider,
  BillingEvent,
  BillingDetails,
} from './billing-provider';

export interface BillingSummary {
  plan: Plan;
  provider: string;
  limits: PlanLimits;
  usage: { projects: number; members: number; scansToday: number };
}

@Injectable()
export class BillingService {
  constructor(
    private readonly store: Store,
    @Inject(BILLING_PROVIDER) private readonly provider: BillingProvider,
  ) {}

  async summary(org: OrganizationRecord): Promise<BillingSummary> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [projects, members, scansToday] = await Promise.all([
      this.store.listProjects(org.id),
      this.store.listMembershipsForOrg(org.id),
      this.store.countScansSince(org.id, startOfDay.toISOString()),
    ]);
    return {
      plan: org.plan,
      provider: this.provider.name,
      limits: planLimits(org.plan),
      usage: { projects: projects.length, members: members.length, scansToday },
    };
  }

  createCheckout(org: OrganizationRecord, plan: Plan, email: string) {
    return this.provider.createCheckout(org.id, plan, email);
  }

  /**
   * Start a plan change. An existing subscriber is sent to the provider's
   * plan-switch flow (which applies proration for upgrades / scheduling for
   * downgrades); a new subscriber goes through checkout. Returns the URL to
   * redirect to and which path was taken.
   */
  async changePlan(
    org: OrganizationRecord,
    targetPlan: Plan,
    email: string,
    returnUrl: string,
  ): Promise<{ url: string; mode: 'checkout' | 'update' }> {
    const sub = await this.store.getSubscription(org.id);
    if (this.provider.changePlanUrl && sub?.stripeCustomerId && sub?.stripeSubscriptionId) {
      const { url } = await this.provider.changePlanUrl(
        sub.stripeCustomerId,
        sub.stripeSubscriptionId,
        targetPlan,
        returnUrl,
      );
      return { url, mode: 'update' };
    }
    const { url } = await this.provider.createCheckout(org.id, targetPlan, email);
    return { url, mode: 'checkout' };
  }

  /**
   * Recent invoices and the default payment method for the org's billing
   * customer. Empty when there's no Stripe customer yet or the provider can't
   * surface it (local provider).
   */
  async billingDetails(org: OrganizationRecord): Promise<BillingDetails> {
    const empty: BillingDetails = { invoices: [], paymentMethod: null };
    if (!this.provider.billingDetails) return empty;
    const sub = await this.store.getSubscription(org.id);
    if (!sub?.stripeCustomerId) return empty;
    try {
      return await this.provider.billingDetails(sub.stripeCustomerId);
    } catch {
      return empty;
    }
  }

  /**
   * A Stripe customer-portal URL for the org to manage its subscription, or
   * null when there's no portal (local provider) or no customer yet.
   */
  async portalUrl(org: OrganizationRecord, returnUrl: string): Promise<string | null> {
    if (!this.provider.createPortalSession) return null;
    const sub = await this.store.getSubscription(org.id);
    if (!sub?.stripeCustomerId) return null;
    try {
      const { url } = await this.provider.createPortalSession(sub.stripeCustomerId, returnUrl);
      return url;
    } catch {
      return null;
    }
  }

  parseWebhook(rawBody: string, signature?: string): BillingEvent | null {
    return this.provider.parseWebhook(rawBody, signature);
  }

  /**
   * Confirm a Checkout Session on return from the provider and grant access
   * immediately (no webhook wait). Only applies when the session belongs to the
   * requesting org. Returns true when access was granted.
   */
  async confirmCheckout(sessionId: string, orgId: string): Promise<boolean> {
    const event = await this.provider.confirmCheckout(sessionId);
    if (!event || event.orgId !== orgId) return false;
    await this.applyEvent(event);
    return true;
  }

  private readonly processedEvents = new Set<string>();

  /**
   * Apply a billing event idempotently (Stripe may retry the same event).
   * `plan_changed` (checkout) grants access and updates the org's plan;
   * `subscription_updated` records the new status (active/past_due/canceled),
   * which the SubscriptionGuard uses to allow or revoke access.
   */
  async applyEvent(event: BillingEvent): Promise<boolean> {
    if (event.eventId) {
      if (this.processedEvents.has(event.eventId)) return false;
      this.processedEvents.add(event.eventId);
    }

    const existing = await this.store.getSubscription(event.orgId);
    const org = await this.store.getOrganization(event.orgId);
    const plan = event.plan ?? existing?.plan ?? org?.plan ?? 'starter';
    const status = event.type === 'plan_changed' ? 'active' : event.status ?? 'active';

    // Only a purchase changes the org's plan tier.
    if (event.type === 'plan_changed' && event.plan) {
      await this.store.updateOrganization(event.orgId, { plan: event.plan });
    }
    await this.store.upsertSubscription({
      orgId: event.orgId,
      plan,
      status,
      stripeCustomerId: event.stripeCustomerId ?? existing?.stripeCustomerId,
      stripeSubscriptionId: event.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
    });
    return true;
  }

  /** Enforce the project-count limit for the org's plan. */
  async assertCanCreateProject(org: OrganizationRecord) {
    const limit = planLimits(org.plan).maxProjects;
    const count = (await this.store.listProjects(org.id)).length;
    if (count >= limit) {
      throw new ForbiddenException(
        `Plan limit reached: ${org.plan} covers ${limit} project(s). ` +
          `Start a new subscription for another project.`,
      );
    }
  }

  /** Enforce the per-day scan cap for the org's plan (UTC day). */
  async assertCanScan(org: OrganizationRecord) {
    const limit = planLimits(org.plan).maxScansPerDay;
    if (!Number.isFinite(limit)) return;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const count = await this.store.countScansSince(org.id, startOfDay.toISOString());
    if (count >= limit) {
      throw new HttpException(
        `Daily scan limit reached: ${org.plan} allows ${limit} scan(s) per day. ` +
          `Upgrade for more.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Enforce that the org's plan unlocks a given feature. */
  assertHasFeature(org: OrganizationRecord, feature: Feature, label: string = feature) {
    if (!hasFeature(org.plan, feature)) {
      throw new ForbiddenException(
        `${label} is not available on the ${org.plan} plan. Upgrade to unlock it.`,
      );
    }
  }
}
