import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Simple in-memory sliding-window rate limiter, keyed by client IP. Adequate
 * for a single instance; in production put a shared limiter (Redis / API
 * gateway) in front. Limit is configurable via RATE_LIMIT_PER_MIN (default 600).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windowMs = 60_000;
  private readonly max = Number(process.env.RATE_LIMIT_PER_MIN ?? 600);
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    if (this.max <= 0) return true; // disabled
    const req = context.switchToHttp().getRequest();
    const ip: string = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < this.windowMs);
    recent.push(now);
    this.hits.set(ip, recent);
    if (recent.length > this.max) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
