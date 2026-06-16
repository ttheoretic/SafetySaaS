import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Turns database connection/credential failures into a clear 503 instead of a
 * bare "internal server error", so a misconfigured DATABASE_URL is obvious.
 */
@Catch(Prisma.PrismaClientInitializationError, Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(exception: Error, host: ArgumentsHost) {
    this.logger.error(exception.message.split('\n')[0]);
    const res = host.switchToHttp().getResponse<Response>();
    res.status(503).json({
      statusCode: 503,
      message:
        'Database unavailable — check DATABASE_URL (correct password? pooler URL?) ' +
        'and run `npx prisma migrate deploy`. Remove DATABASE_URL to use the in-memory store.',
    });
  }
}
