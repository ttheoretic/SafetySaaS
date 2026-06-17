import {
  ForbiddenException, HttpException, HttpStatus, Inject, Injectable,
} from '@nestjs/common';
import { planLimits, Plan, PlanLimits, Feature, hasFeature } from '@riscly/shared';
import { Store, OrganizationRecord } from '../store/store.module';
import { BILLING_PROVIDER, BillingProvider, BillingEvent } from './billing-provider';

export interface BillingSummary {
  plan: Plan;
  provider: string;
  limits: PlanLimits;
  usage: { projects: number; members: number };
}

@Injectable()
export class BillingService {
  constructor(
    private readonly store: Store,
    @Inject(BILLING_PROVIDER) private readonly provider: BillingProvider,
  ) {}

  async summary(org: OrganizationRecord): Promise<BillingSummary> {
    const [projects, members] = await Promise.all([
      this.store.listProjects(org.id),
      this.store.listMembershipsForOrg(org.id),
    ]);
    return {
      plan: org.plan,
      provider: this.provider.name,
      limits: planLimits(org.plan),
      usage: { projects: projects.length, members: members.length },
    };
  }

  createCheckout(org: OrganizationRecord, plan: Plan, email: string) {
    return this.provider.createCheckout(org.id, plan, email);
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
