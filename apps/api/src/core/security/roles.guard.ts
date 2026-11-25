import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from './current-user.decorator';
import { ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard enforces role-based access control (RBAC) across `EXECUTIVE`,
 * `REGIONAL_MANAGER`, `STORE_MANAGER`, and `ADMIN` roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Authenticated user context is required to verify role permissions.',
      );
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: role '${user.role}' is not authorized. Required role(s): ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
