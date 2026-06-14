import { Controller, Get, Module } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get()
  liveness() {
    return { status: 'ok', service: 'failsafe-api', ts: new Date().toISOString() };
  }

  @Get('ready')
  readiness() {
    // In production this checks DB + Redis connectivity.
    return { status: 'ready' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
