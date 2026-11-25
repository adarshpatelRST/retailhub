import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Prisma, RoleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../security/current-user.decorator';
import { DataScope, StoreScopedFilter } from '../security/data-scope.decorator';
import { DataScopeGuard } from '../security/data-scope.guard';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { Roles } from '../security/roles.decorator';
import { RolesGuard } from '../security/roles.guard';

export interface AuditLogQueryDto {
  page?: string;
  limit?: string;
  search?: string;
  action?: string;
  entityName?: string;
  storeId?: string;
  regionId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpsertUserDto {
  email: string;
  fullName: string;
  mobileNumber?: string;
  password?: string;
  role: RoleType;
  isActive?: boolean;
  assignedStoreIds?: string[];
  assignedRegionIds?: string[];
}

export interface UpdateUserAssignmentsDto {
  role?: RoleType;
  fullName?: string;
  mobileNumber?: string;
  isActive?: boolean;
  assignedStoreIds?: string[];
  assignedRegionIds?: string[];
}

@ApiTags('Audit & User Authority')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, DataScopeGuard)
@Controller()
export class AuditAndUsersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/audit-logs
   * Scoped Audit Log query supportingSTORE_MANAGER, REGIONAL_MANAGER, EXECUTIVE, and ADMIN.
   * Enforces operational store/region scoping via @DataScope() and query parameters.
   */
  @Get('audit-logs')
  @Roles(
    RoleType.STORE_MANAGER,
    RoleType.REGIONAL_MANAGER,
    RoleType.EXECUTIVE,
    RoleType.ADMIN,
  )
  @ApiOperation({
    summary:
      'Retrieve role-scoped audit trail entries with correlation IDs and JSON before/after diffs',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityName', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiQuery({ name: 'regionId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAuditLogs(
    @Query() query: AuditLogQueryDto,
    @DataScope() dataScope: StoreScopedFilter,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.action && query.action !== 'ALL') {
      where.action = { contains: query.action };
    }

    if (query.entityName && query.entityName !== 'ALL') {
      where.entityName = { equals: query.entityName };
    }

    if (query.startDate || query.endDate) {
      where.createdOn = {};
      if (query.startDate) {
        where.createdOn.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdOn.lte = end;
      }
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { correlationId: { contains: q } },
        { entityId: { contains: q } },
        { action: { contains: q } },
        { entityName: { contains: q } },
        { user: { fullName: { contains: q } } },
        { user: { email: { contains: q } } },
      ];
    }

    // Apply strict role-scoped boundaries on the actor's store/region assignments
    if (currentUser.role === RoleType.STORE_MANAGER) {
      const scopedStores =
        dataScope.storeId?.in ?? currentUser.assignedStoreIds ?? [];
      where.user = {
        storeAssignments: {
          some: { storeId: { in: scopedStores } },
        },
      };
    } else if (currentUser.role === RoleType.REGIONAL_MANAGER) {
      const scopedRegions =
        dataScope.store?.regionId?.in ?? currentUser.assignedRegionIds ?? [];
      if (query.storeId && query.storeId !== 'ALL_STORES') {
        where.user = {
          storeAssignments: {
            some: {
              storeId: query.storeId,
              store: { regionId: { in: scopedRegions } },
            },
          },
        };
      } else {
        where.user = {
          OR: [
            {
              regionAssignments: {
                some: { regionId: { in: scopedRegions } },
              },
            },
            {
              storeAssignments: {
                some: { store: { regionId: { in: scopedRegions } } },
              },
            },
          ],
        };
      }
    } else {
      // EXECUTIVE or ADMIN with optional storeId / regionId filter
      if (query.storeId && query.storeId !== 'ALL_STORES') {
        where.user = {
          storeAssignments: {
            some: { storeId: query.storeId },
          },
        };
      } else if (query.regionId && query.regionId !== 'ALL_REGIONS') {
        where.user = {
          OR: [
            {
              regionAssignments: {
                some: { regionId: query.regionId },
              },
            },
            {
              storeAssignments: {
                some: { store: { regionId: query.regionId } },
              },
            },
          ],
        };
      }
    }

    const [totalItems, records] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdOn: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: { select: { name: true } },
              storeAssignments: {
                include: {
                  store: {
                    select: {
                      id: true,
                      storeCode: true,
                      name: true,
                      region: { select: { id: true, name: true } },
                    },
                  },
                },
              },
              regionAssignments: {
                include: {
                  region: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const items = records.map((entry) => {
      let parsedOldValues: Record<string, unknown> | null = null;
      let parsedNewValues: Record<string, unknown> | null = null;

      if (entry.oldValues) {
        try {
          parsedOldValues = JSON.parse(entry.oldValues) as Record<
            string,
            unknown
          >;
        } catch {
          parsedOldValues = { raw: entry.oldValues };
        }
      }

      if (entry.newValues) {
        try {
          parsedNewValues = JSON.parse(entry.newValues) as Record<
            string,
            unknown
          >;
        } catch {
          parsedNewValues = { raw: entry.newValues };
        }
      }

      const primaryStore = entry.user?.storeAssignments?.[0]?.store;
      const primaryRegion =
        entry.user?.regionAssignments?.[0]?.region ?? primaryStore?.region;

      return {
        id: entry.id,
        correlationId: entry.correlationId,
        timestamp: entry.createdOn.toISOString(),
        actorId: entry.userId,
        actorName: entry.user?.fullName ?? 'System Automation',
        actorEmail: entry.user?.email ?? 'system@retailhub.com',
        actorRole: entry.user?.role?.name ?? 'SYSTEM',
        storeCode: primaryStore?.storeCode ?? null,
        storeName: primaryStore?.name ?? 'Enterprise HQ',
        regionName: primaryRegion?.name ?? 'All Regions',
        action: entry.action,
        entityName: entry.entityName,
        entityId: entry.entityId,
        oldValues: parsedOldValues,
        newValues: parsedNewValues,
        ipAddress: entry.ipAddress,
        changeSummary: this.buildChangeSummary(parsedOldValues, parsedNewValues),
        remarks:
          typeof parsedNewValues?.comments === 'string'
            ? parsedNewValues.comments
            : typeof parsedNewValues?.reason === 'string'
              ? parsedNewValues.reason
              : typeof parsedNewValues?.notes === 'string'
                ? parsedNewValues.notes
                : 'Recorded via AuditInterceptor',
      };
    });

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }

  /**
   * GET /api/v1/users
   * Full User & Operational Authority directory for Admin UserManagementView.
   */
  @Get('users')
  @Roles(RoleType.ADMIN, RoleType.EXECUTIVE)
  @ApiOperation({
    summary:
      'List all users with their active Role, UserStoreAssignment, and UserRegionAssignment mappings',
  })
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: RoleType | 'ALL',
  ) {
    const where: Prisma.UserWhereInput = { isDeleted: false };

    if (role && role !== 'ALL') {
      where.role = { name: role };
    }

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { mobileNumber: { contains: q } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdOn: 'desc' },
      include: {
        role: true,
        storeAssignments: {
          include: {
            store: {
              select: {
                id: true,
                storeCode: true,
                name: true,
                city: true,
                regionId: true,
              },
            },
          },
        },
        regionAssignments: {
          include: {
            region: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      mobileNumber: u.mobileNumber ?? '',
      role: u.role.name,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      assignedStores: u.storeAssignments.map((sa) => ({
        id: sa.store.id,
        storeCode: sa.store.storeCode,
        name: sa.store.name,
        city: sa.store.city,
        isPrimary: sa.isPrimary,
      })),
      assignedRegions: u.regionAssignments.map((ra) => ({
        id: ra.region.id,
        code: ra.region.code,
        name: ra.region.name,
      })),
    }));
  }

  /**
   * POST /api/v1/users
   * Onboard a new user and dynamically assign their role, stores, and regions.
   */
  @Post('users')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary:
      'Onboard a new user with dynamic role, store, and region authority assignments',
  })
  async createUser(
    @Body() dto: UpsertUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!dto.email || !dto.fullName || !dto.role) {
      throw new BadRequestException(
        'email, fullName, and role are required to onboard a user.',
      );
    }

    const roleRecord = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!roleRecord) {
      throw new NotFoundException(`Role ${dto.role} does not exist.`);
    }

    const passwordHash = await bcrypt.hash(
      dto.password || 'RetailHub@2026',
      10,
    );

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          fullName: dto.fullName.trim(),
          mobileNumber: dto.mobileNumber?.trim() || null,
          passwordHash,
          roleId: roleRecord.id,
          isActive: dto.isActive ?? true,
          createdBy: actor.id,
        },
      });

      if (dto.assignedStoreIds && dto.assignedStoreIds.length > 0) {
        await tx.userStoreAssignment.createMany({
          data: dto.assignedStoreIds.map((storeId, idx) => ({
            userId: created.id,
            storeId,
            isPrimary: idx === 0,
            createdBy: actor.id,
          })),
        });
      }

      if (dto.assignedRegionIds && dto.assignedRegionIds.length > 0) {
        await tx.userRegionAssignment.createMany({
          data: dto.assignedRegionIds.map((regionId) => ({
            userId: created.id,
            regionId,
            createdBy: actor.id,
          })),
        });
      }

      return created;
    });
  }

  /**
   * PUT /api/v1/users/:id
   * Dynamically switch a user's Role, Store assignments, Region assignments, or active status.
   */
  @Put('users/:id')
  @Patch('users/:id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary:
      'Dynamically switch user role and reassign UserStoreAssignment / UserRegionAssignment scopes',
  })
  async updateUserAuthority(
    @Param('id') userId: string,
    @Body() dto: UpdateUserAssignmentsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        storeAssignments: true,
        regionAssignments: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    let nextRoleId = existing.roleId;
    if (dto.role && dto.role !== existing.role.name) {
      const roleRec = await this.prisma.role.findUnique({
        where: { name: dto.role },
      });
      if (!roleRec) {
        throw new NotFoundException(`Role ${dto.role} not found.`);
      }
      nextRoleId = roleRec.id;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: dto.fullName?.trim() ?? existing.fullName,
          mobileNumber:
            dto.mobileNumber !== undefined
              ? dto.mobileNumber.trim() || null
              : existing.mobileNumber,
          roleId: nextRoleId,
          isActive: dto.isActive ?? existing.isActive,
          updatedBy: actor.id,
        },
      });

      if (Array.isArray(dto.assignedStoreIds)) {
        await tx.userStoreAssignment.deleteMany({ where: { userId } });
        if (dto.assignedStoreIds.length > 0) {
          await tx.userStoreAssignment.createMany({
            data: dto.assignedStoreIds.map((storeId, idx) => ({
              userId,
              storeId,
              isPrimary: idx === 0,
              createdBy: actor.id,
            })),
          });
        }
      }

      if (Array.isArray(dto.assignedRegionIds)) {
        await tx.userRegionAssignment.deleteMany({ where: { userId } });
        if (dto.assignedRegionIds.length > 0) {
          await tx.userRegionAssignment.createMany({
            data: dto.assignedRegionIds.map((regionId) => ({
              userId,
              regionId,
              createdBy: actor.id,
            })),
          });
        }
      }

      return updatedUser;
    });
  }

  private buildChangeSummary(
    oldVals: Record<string, unknown> | null,
    newVals: Record<string, unknown> | null,
  ): string {
    if (!oldVals && !newVals) {
      return 'No payload diff recorded';
    }
    if (!oldVals && newVals) {
      const keys = Object.keys(newVals).slice(0, 3);
      return keys
        .map((k) => `${k}: ➔ ${String(newVals[k])}`)
        .join(' · ');
    }
    if (oldVals && !newVals) {
      return 'Record archived / deleted';
    }

    const diffs: string[] = [];
    const allKeys = Array.from(
      new Set([...Object.keys(oldVals!), ...Object.keys(newVals!)]),
    );
    for (const key of allKeys) {
      const before = oldVals![key];
      const after = newVals![key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diffs.push(
          `${key}: ${before !== undefined ? String(before) : 'null'} ➔ ${
            after !== undefined ? String(after) : 'null'
          }`,
        );
      }
    }
    return diffs.length > 0
      ? diffs.slice(0, 3).join(' · ')
      : 'Metadata updated';
  }
}
