import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from './current-user.decorator';
import { StoreScopedFilter } from './data-scope.decorator';

/**
 * DataScopeGuard enforces strict server-side data scoping based on the authenticated user's role:
 * - `STORE_MANAGER`: queries `UserStoreAssignment` for user's store IDs and sets
 *   `req.dataScope = { storeId: { in: storeIds } }`
 * - `REGIONAL_MANAGER`: queries `UserRegionAssignment` for user's region IDs and sets
 *   `req.dataScope = { store: { regionId: { in: regionIds } } }`
 * - `EXECUTIVE` or `ADMIN`: sets `req.dataScope = {}` (enterprise-wide access)
 */
@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: AuthenticatedUser;
        dataScope?: StoreScopedFilter;
      }
    >();

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException(
        'Cannot resolve data scope without an authenticated user.',
      );
    }

    switch (user.role) {
      case RoleType.STORE_MANAGER: {
        const assignments = await this.prisma.userStoreAssignment.findMany({
          where: { userId: user.id },
          select: { storeId: true },
        });
        const storeIds = assignments.map((item) => item.storeId);
        request.dataScope = {
          storeId: { in: storeIds },
        };
        break;
      }

      case RoleType.REGIONAL_MANAGER: {
        const assignments = await this.prisma.userRegionAssignment.findMany({
          where: { userId: user.id },
          select: { regionId: true },
        });
        const regionIds = assignments.map((item) => item.regionId);
        request.dataScope = {
          store: {
            regionId: { in: regionIds },
          },
        };
        break;
      }

      case RoleType.EXECUTIVE:
      case RoleType.ADMIN:
      default: {
        request.dataScope = {};
        break;
      }
    }

    return true;
  }
}
