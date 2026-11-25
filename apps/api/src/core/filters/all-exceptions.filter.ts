import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiErrorResponse } from '../common/api-error.dto';

/**
 * Global exception filter catching HTTP exceptions, Prisma ORM known request errors
 * (`P2002` unique violation, `P2025` record not found, `P2003` foreign key violation),
 * and unhandled runtime errors, returning a standardized `ApiErrorResponse`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<
      Request & { correlationId?: string }
    >();
    const response = ctx.getResponse<Response>();

    const headerCorrelationId = request.headers['x-correlation-id'];
    const correlationId =
      request.correlationId ||
      (Array.isArray(headerCorrelationId)
        ? headerCorrelationId[0]
        : headerCorrelationId) ||
      uuidv4();

    request.correlationId = correlationId;
    response.setHeader('X-Correlation-Id', correlationId);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected server error occurred.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = HttpStatus[statusCode] || 'HTTP_EXCEPTION';
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;
        errorCode =
          typeof resObj.error === 'string'
            ? resObj.error.toUpperCase().replace(/\s+/g, '_')
            : HttpStatus[statusCode] || 'HTTP_EXCEPTION';

        if (Array.isArray(resObj.message)) {
          message = 'Request validation failed.';
          details = resObj.message;
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }

        if (resObj.details !== undefined) {
          details = resObj.details;
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      this.isPrismaKnownErrorDuckType(exception)
    ) {
      const prismaError = exception as {
        code: string;
        meta?: Record<string, unknown>;
        message: string;
      };

      switch (prismaError.code) {
        case 'P2002': {
          statusCode = HttpStatus.CONFLICT;
          errorCode = 'PRISMA_UNIQUE_CONSTRAINT_VIOLATION';
          const target = prismaError.meta?.target;
          message = `Unique constraint violation on field(s): ${
            Array.isArray(target) ? target.join(', ') : target || 'unknown'
          }.`;
          details = { prismaCode: 'P2002', target };
          break;
        }
        case 'P2025': {
          statusCode = HttpStatus.NOT_FOUND;
          errorCode = 'PRISMA_RECORD_NOT_FOUND';
          const cause =
            typeof prismaError.meta?.cause === 'string'
              ? prismaError.meta.cause
              : 'The requested database record could not be found.';
          message = cause;
          details = { prismaCode: 'P2025', meta: prismaError.meta };
          break;
        }
        case 'P2003': {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = 'PRISMA_FOREIGN_KEY_VIOLATION';
          message =
            'Operation failed due to a foreign key reference constraint.';
          details = {
            prismaCode: 'P2003',
            fieldName: prismaError.meta?.field_name,
          };
          break;
        }
        default: {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = `PRISMA_ERROR_${prismaError.code}`;
          message = 'A database query constraint error occurred.';
          details = { prismaCode: prismaError.code };
          break;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    const errorStack =
      exception instanceof Error ? exception.stack : JSON.stringify(exception);

    this.logger.error(
      `[${correlationId}] ${request.method} ${request.originalUrl || request.url} -> ${statusCode} (${errorCode}): ${message}`,
      errorStack,
    );

    const errorPayload = new ApiErrorResponse({
      statusCode,
      code: errorCode,
      message,
      details,
      path: request.originalUrl || request.url,
      method: request.method,
      correlationId,
    });

    response.status(statusCode).json(errorPayload);
  }

  private isPrismaKnownErrorDuckType(
    err: unknown,
  ): err is { code: string; meta?: Record<string, unknown>; message: string } {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'string' &&
      /^P20\d{2}$/.test((err as { code: string }).code)
    );
  }
}
