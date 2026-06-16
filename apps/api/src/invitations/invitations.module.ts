import {
  BadRequestException, Body, Controller, ForbiddenException, Get, Inject, Module, Post,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IsEmail, IsIn, IsString } from 'class-validator';
import { canAddMember, Plan } from '@riscly/shared';
import { Store, StoreModule, Role } from '../store/store.module';
import { Auth, AuthContext, RequirePermission } from '../auth/auth-context';
import { AuditService } from '../auth/audit.service';
import { EMAIL_PROVIDER, EmailProvider } from '../email/email.module';

const ROLES: Role[] = ['admin', 'member', 'viewer']; // owners aren't invited

class InviteDto {
  @IsEmail() email!: string;
  @IsIn(ROLES) role!: Role;
}

class AcceptDto {
  @IsString() token!: string;
}

@Controller()
class InvitationsController {
  constructor(
    private readonly store: Store,
    private readonly audit: AuditService,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  /** Invite a user to the active org. Admins+ only; enforces the plan's member cap. */
  @Post('orgs/invitations')
  @RequirePermission('member:manage')
  async invite(@Auth() auth: AuthContext, @Body() dto: InviteDto) {
    const members = await this.store.listMembershipsForOrg(auth.org.id);
    if (!canAddMember(auth.org.plan as Plan, members.length)) {
      throw new ForbiddenException(
        `Plan limit reached: ${auth.org.plan} caps team members. Upgrade to add more.`,
      );
    }
    const invitation = await this.store.createInvitation({
      orgId: auth.org.id,
      email: dto.email,
      role: dto.role,
      token: randomUUID(),
      invitedById: auth.user.id,
    });
    void this.audit.record(auth, 'member.invite', { type: 'invitation', id: invitation.id }, {
      email: dto.email,
      role: dto.role,
    });

    // Send the invitation email (logged in dev).
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const link = `${appUrl}/accept-invite?token=${invitation.token}`;
    void this.email.send({
      to: dto.email,
      subject: `You're invited to ${auth.org.name} on Riscly`,
      html: `<p>${auth.user.name ?? auth.user.email} invited you to join <b>${auth.org.name}</b> as ${dto.role}.</p>` +
        `<p><a href="${link}">Accept the invitation</a></p>`,
    });

    // The token is returned for the dev flow; in production users click the email.
    return { id: invitation.id, email: invitation.email, role: invitation.role, token: invitation.token };
  }

  @Get('orgs/invitations')
  @RequirePermission('member:manage')
  list(@Auth() auth: AuthContext) {
    return this.store.listInvitations(auth.org.id);
  }

  /** Accept an invitation as the authenticated user — joins the inviting org. */
  @Post('invitations/accept')
  async accept(@Auth() auth: AuthContext, @Body() dto: AcceptDto) {
    const invitation = await this.store.getInvitationByToken(dto.token);
    if (!invitation || invitation.acceptedAt) {
      throw new BadRequestException('Invalid or already-used invitation');
    }
    const existing = await this.store.getMembership(invitation.orgId, auth.user.id);
    if (!existing) {
      await this.store.addMembership({
        orgId: invitation.orgId,
        userId: auth.user.id,
        role: invitation.role,
      });
    }
    await this.store.markInvitationAccepted(invitation.id);
    const org = await this.store.getOrganization(invitation.orgId);
    return { orgId: invitation.orgId, orgName: org?.name, role: invitation.role };
  }
}

@Module({
  imports: [StoreModule],
  controllers: [InvitationsController],
})
export class InvitationsModule {}
