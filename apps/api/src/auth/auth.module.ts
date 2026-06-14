import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { StoreModule } from '../store/store.module';
import { AuthService } from './auth.service';
import { AuditService } from './audit.service';
import { AuthGuard } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';

/**
 * Registers authentication + RBAC globally. AuthGuard runs first (resolves the
 * tenant), PermissionsGuard second (enforces role permissions). Both are
 * exported so other modules can depend on AuthService / AuditService.
 */
@Global()
@Module({
  imports: [StoreModule],
  providers: [
    AuthService,
    AuditService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, AuditService],
})
export class AuthModule {}
