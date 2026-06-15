import { Injectable } from '@nestjs/common';
import { Store } from '../store/store.module';
import type { AuthContext } from './auth-context';

/** Records mutating actions to the append-only audit log. */
@Injectable()
export class AuditService {
  constructor(private readonly store: Store) {}

  async record(
    auth: AuthContext,
    action: string,
    target?: { type: string; id: string },
    metadata: Record<string, unknown> = {},
  ) {
    await this.store.addAuditLog({
      orgId: auth.org.id,
      actorUserId: auth.user.id,
      action,
      targetType: target?.type,
      targetId: target?.id,
      metadata,
    });
  }
}
