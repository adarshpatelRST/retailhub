import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiResponse,
  PaginatedResponse,
} from '../common/api-response.dto';

/**
 * TransformInterceptor reads `X-Correlation-Id` from request headers (or generates a UUID v4),
 * attaches it to the request and response headers, and wraps all successful payloads
 * in the standardized `ApiResponse<T>` envelope.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<
      Request & { correlationId?: string }
    >();
    const response = httpCtx.getResponse<Response>();

    const headerCorrelationId = request.headers['x-correlation-id'];
    const correlationId =
      request.correlationId ||
      (Array.isArray(headerCorrelationId)
        ? headerCorrelationId[0]
        : headerCorrelationId) ||
      uuidv4();

    request.correlationId = correlationId;
    response.setHeader('X-Correlation-Id', correlationId);

    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload instanceof ApiResponse) {
          payload.correlationId = payload.correlationId || correlationId;
          payload.timestamp = payload.timestamp || new Date().toISOString();
          return payload as ApiResponse<T>;
        }

        if (payload instanceof PaginatedResponse) {
          return new ApiResponse<T>({
            data: payload.items as unknown as T,
            meta: payload.meta,
            correlationId,
          });
        }

        return new ApiResponse<T>({
          data: payload as T,
          correlationId,
        });
      }),
    );
  }
}
