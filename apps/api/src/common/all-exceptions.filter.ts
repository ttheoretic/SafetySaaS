import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

/**
 * Catch-all exception filter — production hygiene. A security product must not
 * leak its own internals: unknown errors return a generic 500 with a correlation
 * id (the full error is logged server-side only), never a stack trace or raw
 * message to the client. HttpExceptions pass through with their real status, and
 * Prisma-style DB errors degrade to a clean 503.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Known HTTP errors (401/403/404/400/…) — surface their real status + body.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    // Prisma / DB errors carry a `Pxxxx` code — degrade to a clean 503.
    const code = (exception as { code?: string })?.code;
    if (typeof code === 'string' && /^P\d/.test(code)) {
      this.logger.error(
        `DB error [${code}]: ${(exception as Error)?.message?.split('\n')[0] ?? ''}`,
      );
      res.status(503).json({ statusCode: 503, message: 'Database temporarily unavailable.' });
      return;
    }

    // Anything else is unexpected — log it fully, return a sanitized 500.
    const requestId = randomUUID();
    this.logger.error(
      `[${requestId}] ${req?.method} ${req?.url} — ${(exception as Error)?.message ?? exception}`,
      (exception as Error)?.stack,
    );
    res.setHeader('X-Request-Id', requestId);
    res.status(500).json({ statusCode: 500, message: 'Internal server error', requestId });
  }
}
