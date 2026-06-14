import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { planLimits, Plan, PlanLimits } from '@failsafe/shared';
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

  summary(org: OrganizationRecord): BillingSummary {
    return {
      plan: org.plan,
      provider: this.provider.name,
      limits: planLimits(org.plan),
      usage: {
        projects: this.store.listProjects(org.id).length,
        members: this.store.listMembershipsForOrg(org.id).length,
      },
    };
  }

  createCheckout(org: OrganizationRecord, plan: Plan, email: string) {
    return this.provider.createCheckout(org.id, plan, email);
  }

  parseWebhook(rawBody: string, signature?: string): BillingEvent | null {
    return this.provider.parseWebhook(rawBody, signature);
  }

  applyEvent(event: BillingEvent) {
    this.store.updateOrganization(event.orgId, { plan: event.plan });
    this.store.upsertSubscription({
      orgId: event.orgId,
      plan: event.plan,
      status: 'active',
      stripeCustomerId: event.stripeCustomerId,
      stripeSubscriptionId: event.stripeSubscriptionId,
    });
  }

  /** Enforce the project-count limit for the org's plan. */
  assertCanCreateProject(org: OrganizationRecord) {
    const limit = planLimits(org.plan).maxProjects;
    const count = this.store.listProjects(org.id).length;
    if (count >= limit) {
      throw new ForbiddenException(
        `Plan limit reached: ${org.plan} allows ${limit} project(s). Upgrade to add more.`,
      );
    }
  }
}
