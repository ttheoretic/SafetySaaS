import { Global, Logger, Module } from '@nestjs/common';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

/** Outbound email identity. Each has its own from-address so product, alert and
 *  support mail are clearly distinct to recipients (and filterable by them). */
export type MailCategory = 'product' | 'alerts' | 'support';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Sender override; defaults to the provider's product sender. */
  from?: string;
  /** Reply-To (e.g. route support replies back to the user). */
  replyTo?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

function emailDomain(): string {
  return process.env.EMAIL_DOMAIN || 'riscly.ai';
}

/** The from-address for an email category (env-overridable, sane defaults). */
export function senderFor(category: MailCategory): string {
  const d = emailDomain();
  const config: Record<MailCategory, { env: string; def: string }> = {
    product: { env: 'EMAIL_FROM_PRODUCT', def: `Riscly <hello@${d}>` },
    alerts: { env: 'EMAIL_FROM_ALERTS', def: `Riscly Alerts <alerts@${d}>` },
    support: { env: 'EMAIL_FROM_SUPPORT', def: `Riscly Support <support@${d}>` },
  };
  const c = config[category];
  return process.env[c.env] || process.env.EMAIL_FROM || c.def;
}

/** The inbox support requests are delivered to. */
export function supportInbox(): string {
  return process.env.SUPPORT_INBOX || `support@${emailDomain()}`;
}

/** Logs emails instead of sending — used when no email provider is configured. */
class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly logger = new Logger('Email');
  async send(msg: EmailMessage) {
    this.logger.log(`[dev email] from=${msg.from ?? 'default'} to=${msg.to} · ${msg.subject}`);
  }
}

/** Sends via Resend's HTTP API (no SDK dependency). */
class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly logger = new Logger('Email');
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send(msg: EmailMessage) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: msg.from ?? this.from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        }),
      });
      if (!res.ok) this.logger.warn(`Resend send failed: ${res.status}`);
    } catch (err) {
      this.logger.warn(`Resend send error: ${(err as Error).message}`);
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (): EmailProvider => {
        const key = process.env.RESEND_API_KEY;
        if (key) {
          Logger.log('Email: Resend provider active.', 'EmailModule');
          return new ResendEmailProvider(key, senderFor('product'));
        }
        Logger.log('Email: no RESEND_API_KEY — console provider (logs only).', 'EmailModule');
        return new ConsoleEmailProvider();
      },
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
