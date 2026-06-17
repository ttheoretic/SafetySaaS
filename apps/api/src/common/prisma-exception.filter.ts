import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Human hint per Prisma error code, surfaced in the response + logs. */
const CODE_HINTS: Record<string, string> = {
  P1000: 'authentication failed — wrong DB password',
  P1001: "can't reach the database server — wrong host/port or network",
  P1002: 'database server reached but timed out',
  P1003: 'database does not exist',
  P1010: 'access denied for this user',
  P1017: 'server closed the connection',
  P2021: 'a table does not exist — run `npx prisma migrate deploy`',
  P2022: 'a column does not exist — schema/migration mismatch',
};

/**
 * Turns database connection/credential failures into a clear 503 instead of a
 * bare "internal server error". Logs the Prisma error name + code so a
 * misconfigured DATABASE_URL or a missing migration is obvious in the host logs.
 */
@Catch(Prisma.PrismaClientInitializationError, Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(exception: Error, host: ArgumentsHost) {
    const code: string | undefined = (exception as { code?: string }).code;
    const firstLine =
      (exception.message ?? '').split('\n').map((l) => l.trim()).find(Boolean) ??
      '(no message)';
    const hint = code ? CODE_HINTS[code] : undefined;
    this.logger.error(
      `${exception.name}${code ? ` [${code}]` : ''}: ${hint ?? firstLine}`,
    );

    const res = host.switchToHttp().getResponse<Response>();
    res.status(503).json({
      statusCode: 503,
      message:
        `Database unavailable${code ? ` (${code}${hint ? `: ${hint}` : ''})` : ''}. ` +
        'Check DATABASE_URL/DIRECT_URL and run `npx prisma migrate deploy`. ' +
        'Remove DATABASE_URL to use the in-memory store.',
    });
  }
}
