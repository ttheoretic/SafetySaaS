import { Body, Controller, Inject, Module, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { Auth, AuthContext } from '../auth/auth-context';
import {
  EMAIL_PROVIDER,
  EmailProvider,
  senderFor,
  supportInbox,
} from './email.module';
import { buildSupportEmail } from './templates';

class SupportDto {
  @IsString() @Length(3, 160)
  subject!: string;

  @IsString() @Length(10, 5000)
  message!: string;
}

@Controller('support')
class SupportController {
  constructor(@Inject(EMAIL_PROVIDER) private readonly email: EmailProvider) {}

  /** Authenticated contact form → delivered to the support inbox, with the
   *  user's address as Reply-To so the team can answer directly. */
  @Post()
  async contact(@Auth() auth: AuthContext, @Body() dto: SupportDto) {
    const { subject, html } = buildSupportEmail({
      fromName: auth.user.name,
      fromEmail: auth.user.email,
      org: auth.org.name,
      subject: dto.subject,
      message: dto.message,
    });
    await this.email.send({
      to: supportInbox(),
      from: senderFor('support'),
      replyTo: auth.user.email,
      subject,
      html,
    });
    return { ok: true };
  }
}

@Module({ controllers: [SupportController] })
export class SupportModule {}
