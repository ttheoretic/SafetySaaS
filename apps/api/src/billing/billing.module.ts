import {
  Body, Controller, Get, Global, Headers, Logger, Module, Post, Req,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { Request } from 'express';
import { IsIn } from 'class-validator';
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

  // (checkout/webhook below)

  @Post('checkout')
  @RequirePermission('billing:manage')
  async checkout(@Auth() auth: AuthContext, @Body() dto: CheckoutDto) {
    const result = await this.billing.createCheckout(auth.org, dto.plan, auth.user.email);
    this.audit.record(auth, 'billing.checkout', { type: 'org', id: auth.org.id }, { plan: dto.plan });
    return result;
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
