import { Global, Logger, Module } from '@nestjs/common';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

/** Logs emails instead of sending — used when no email provider is configured. */
class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly logger = new Logger('Email');
  async send(msg: EmailMessage) {
    this.logger.log(`[dev email] to=${msg.to} · ${msg.subject}`);
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
        body: JSON.stringify({ from: this.from, to: msg.to, subject: msg.subject, html: msg.html }),
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
          return new ResendEmailProvider(key, process.env.EMAIL_FROM ?? 'FailSafe AI <noreply@failsafe.ai>');
        }
        Logger.log('Email: no RESEND_API_KEY — console provider (logs only).', 'EmailModule');
        return new ConsoleEmailProvider();
      },
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
