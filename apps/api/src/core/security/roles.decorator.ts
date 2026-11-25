import { SetMetadata } from '@nestjs/common';
import { RoleType } from '@prisma/client';

export const ROLES_KEY = 'retailhub_roles';

/**
 * Decorator specifying allowed `RoleType` values (`EXECUTIVE`, `REGIONAL_MANAGER`, `STORE_MANAGER`, `ADMIN`)
 * for a controller or route handler.
 */
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
