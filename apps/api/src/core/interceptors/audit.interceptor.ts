import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../security/current-user.decorator';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'clientsecret',
  'authorization',
]);

/**
 * Recursively clones an object or array and strips all sensitive keys
 * (`password`, `token`, `secret`, `authorization`, and case-insensitive variants)
 * prior to persisting JSON snapshots to `AuditLog`.
 */
export function sanitizeAuditPayload(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeAuditPayload(item));
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      input as Record<string, unknown>,
    )) {
      const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
      if (
        SENSITIVE_KEYS.has(normalizedKey) ||
        normalizedKey.includes('password') ||
        normalizedKey.includes('secret') ||
        normalizedKey.includes('token') ||
        normalizedKey === 'authorization'
      ) {
        continue;
      }
      sanitized[key] = sanitizeAuditPayload(value);
    }
    return sanitized;
  }

  return input;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<
      Request & {
        user?: AuthenticatedUser;
        correlationId?: string;
        auditOldValues?: Record<string, unknown>;
      }
    >();

    const method = request.method?.toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const headerCorrelationId = request.headers['x-correlation-id'];
    const correlationId =
      request.correlationId ||
      (Array.isArray(headerCorrelationId)
        ? headerCorrelationId[0]
        : headerCorrelationId) ||
      uuidv4();
    request.correlationId = correlationId;

    const sanitizedBody = sanitizeAuditPayload(request.body);
    const oldValuesSnapshot = request.auditOldValues
      ? JSON.stringify(sanitizeAuditPayload(request.auditOldValues))
      : null;

    return next.handle().pipe(
      tap({
        next: (responsePayload: unknown) => {
          void this.recordAuditEntry({
            correlationId,
            userId: request.user?.id ?? null,
            method,
            url: request.originalUrl || request.url,
            params: request.params,
            sanitizedBody,
            oldValuesSnapshot,
            responsePayload,
            ipAddress: this.extractClientIp(request),
          });
        },
      }),
    );
  }

  private async recordAuditEntry(params: {
    correlationId: string;
    userId: string | null;
    method: string;
    url: string;
    params: Record<string, string>;
    sanitizedBody: unknown;
    oldValuesSnapshot: string | null;
    responsePayload: unknown;
    ipAddress: string | null;
  }): Promise<void> {
    try {
      const entityName = this.resolveEntityName(params.url);
      const entityId = this.resolveEntityId(
        params.params,
        params.sanitizedBody,
        params.responsePayload,
      );
      const action = `${params.method}_${entityName.toUpperCase()}`;
      const newValues =
        params.sanitizedBody !== undefined && params.sanitizedBody !== null
          ? JSON.stringify(params.sanitizedBody)
          : null;

      await this.prisma.auditLog.create({
        data: {
          correlationId: params.correlationId,
          userId: params.userId,
          action,
          entityName,
          entityId,
          oldValues: params.oldValuesSnapshot,
          newValues,
          ipAddress: params.ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write AuditLog for correlationId=${params.correlationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private resolveEntityName(url: string): string {
    const cleanPath = url.split('?')[0];
    const segments = cleanPath
      .split('/')
      .filter(
        (segment) =>
          segment.length > 0 &&
          segment.toLowerCase() !== 'api' &&
          !/^v\d+$/i.test(segment),
      );
    return segments[0] || 'SystemResource';
  }

  private resolveEntityId(
    routeParams: Record<string, string> | undefined,
    sanitizedBody: unknown,
    responsePayload: unknown,
  ): string {
    if (routeParams?.id) {
      return String(routeParams.id);
    }

    if (
      typeof responsePayload === 'object' &&
      responsePayload !== null
    ) {
      const resp = responsePayload as Record<string, unknown>;
      if (typeof resp.id === 'string') {
        return resp.id;
      }
      if (
        typeof resp.data === 'object' &&
        resp.data !== null &&
        typeof (resp.data as Record<string, unknown>).id === 'string'
      ) {
        return (resp.data as Record<string, unknown>).id as string;
      }
    }

    if (
      typeof sanitizedBody === 'object' &&
      sanitizedBody !== null &&
      typeof (sanitizedBody as Record<string, unknown>).id === 'string'
    ) {
      return (sanitizedBody as Record<string, unknown>).id as string;
    }

    return 'N/A';
  }

  private extractClientIp(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }
    return request.ip || request.socket?.remoteAddress || null;
  }
}
