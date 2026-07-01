import {
  BadRequestException, Body, Controller, Get, Global, Headers, Logger, Module, Post, Req,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { Request } from 'express';
import { IsIn, IsString } from 'class-validator';
import { PLAN_ORDER, Plan } from '@riscly/shared';
import { StoreModule } from '../store/store.module';
import {
  AllowWithoutSubscription, Auth, AuthContext, Public, RequirePermission,
} from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { BILLING_PROVIDER, BillingProvider } from './billing-provider';
import { BillingService } from './billing.service';
import { SubscriptionGuard } from './subscription.guard';
import { StripeBillingProvider } from './stripe.provider';
import { NullBillingProvider } from './null.provider';

class CheckoutDto {
  @IsIn(PLAN_ORDER) plan!: Plan;
}

class ConfirmDto {
  @IsString() sessionId!: string;
}

// Reaching and completing checkout must work before a subscription exists.
@AllowWithoutSubscription()
@Controller('billing')
class BillingController {
  private readonly logger = new Logger(BillingController.name);
  constructor(
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('project:read')
  summary(@Auth() auth: AuthContext) {
    return this.billing.summary(auth.org);
  }

  /** Recent invoices + default payment method for the billing settings page. */
  @Get('details')
  @RequirePermission('project:read')
  details(@Auth() auth: AuthContext) {
    return this.billing.billingDetails(auth.org);
  }

  // (checkout/webhook below)

  /**
   * Start a plan change. Existing subscribers go through the provider's
   * plan-switch flow (proration on upgrade / scheduling on downgrade); new
   * subscribers go through checkout. Returns the URL to redirect to.
   */
  @Post('change-plan')
  @RequirePermission('billing:manage')
  async changePlan(@Auth() auth: AuthContext, @Body() dto: CheckoutDto) {
    const returnUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/settings?tab=billing`;
    const result = await this.billing.changePlan(auth.org, dto.plan, auth.user.email, returnUrl);
    this.audit.record(auth, 'billing.change_plan', { type: 'org', id: auth.org.id }, {
      plan: dto.plan,
      mode: result.mode,
    });
    return result;
  }

  @Post('checkout')
  @RequirePermission('billing:manage')
  async checkout(@Auth() auth: AuthContext, @Body() dto: CheckoutDto) {
    const result = await this.billing.createCheckout(auth.org, dto.plan, auth.user.email);
    this.audit.record(auth, 'billing.checkout', { type: 'org', id: auth.org.id }, { plan: dto.plan });
    return result;
  }

  /** Stripe customer-portal URL for managing the subscription. */
  @Post('portal')
  @RequirePermission('billing:manage')
  async portal(@Auth() auth: AuthContext) {
    const returnUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/settings`;
    const url = await this.billing.portalUrl(auth.org, returnUrl);
    if (!url) {
      throw new BadRequestException('No billing portal available for this workspace.');
    }
    return { url };
  }

  /**
   * Confirm a Checkout Session on return from Stripe so the workspace is
   * activated immediately, without waiting for the async webhook.
   */
  @Post('confirm')
  @RequirePermission('billing:manage')
  async confirm(@Auth() auth: AuthContext, @Body() dto: ConfirmDto) {
    const active = await this.billing.confirmCheckout(dto.sessionId, auth.org.id);
    if (active) {
      this.audit.record(auth, 'billing.confirm', { type: 'org', id: auth.org.id }, {});
    }
    return { active };
  }

  /** Stripe (or dev) webhook — public, verified inside the provider. */
  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: unknown,
    @Headers('stripe-signature') signature?: string,
  ) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);
    const event = this.billing.parseWebhook(raw, signature);
    if (!event) return { received: true, applied: false };
    const applied = await this.billing.applyEvent(event);
    if (applied) this.logger.log(`Plan changed for org ${event.orgId} -> ${event.plan}`);
    return { received: true, applied };
  }
}

@Global()
@Module({
  imports: [StoreModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    {
      provide: BILLING_PROVIDER,
      useFactory: (): BillingProvider => {
        const key = process.env.STRIPE_SECRET_KEY;
        if (key) {
          Logger.log('Billing: Stripe provider active.', 'BillingModule');
          return new StripeBillingProvider(key, process.env.STRIPE_WEBHOOK_SECRET);
        }
        Logger.log('Billing: no STRIPE_SECRET_KEY — local provider.', 'BillingModule');
        return new NullBillingProvider();
      },
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
