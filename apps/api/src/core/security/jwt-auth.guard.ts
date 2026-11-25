import {
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export const IS_PUBLIC_KEY = 'retailhub_is_public';

/**
 * Marks a controller or route handler as publicly accessible without JWT authentication.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { message?: string } | undefined,
  ): TUser {
    if (err || !user) {
      const reason =
        info?.message ||
        (err instanceof Error ? err.message : 'Authentication token is missing or invalid.');
      throw err instanceof UnauthorizedException
        ? err
        : new UnauthorizedException(reason);
    }
    return user;
  }
}
