import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/auth-context';
import { Store, StoreModule } from '../store/store.module';

@Public()
@Controller('health')
class HealthController {
  constructor(private readonly store: Store) {}

  /** Liveness — the process is up. */
  @Get()
  liveness() {
    return { status: 'ok', service: 'riscly-api', ts: new Date().toISOString() };
  }

  /** Readiness — the process can serve traffic (its store is reachable). */
  @Get('ready')
  async readiness() {
    const dbOk = await this.store.ping().catch(() => false);
    if (!dbOk) {
      throw new ServiceUnavailableException({ status: 'unavailable', db: 'down' });
    }
    return { status: 'ready', db: 'up' };
  }
}

@Module({ imports: [StoreModule], controllers: [HealthController] })
export class HealthModule {}
