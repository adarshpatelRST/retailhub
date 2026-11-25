import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/auth.dto';
import { RoleType } from '@prisma/client';

export interface UserSummaryItem {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  avatarUrl: string | null;
  role: RoleType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignedStores: Array<{ id: string; name: string; storeCode: string }>;
  assignedRegions: Array<{ id: string; name: string; code: string }>;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll(params?: {
    role?: RoleType;
    search?: string;
  }): Promise<UserSummaryItem[]> {
    const where: any = {};

    if (params?.role) {
      where.role = params.role;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { mobileNumber: { contains: q } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        storeAssignments: {
          include: {
            store: {
              select: { id: true, name: true, storeCode: true },
            },
          },
        },
        regionAssignments: {
          include: {
            region: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      mobileNumber: u.mobileNumber,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      assignedStores: u.storeAssignments.map((sa) => ({
        id: sa.store.id,
        name: sa.store.name,
        storeCode: sa.store.storeCode,
      })),
      assignedRegions: u.regionAssignments.map((ra) => ({
        id: ra.region.id,
        name: ra.region.name,
        code: ra.region.code,
      })),
    }));
  }

  async findById(id: string): Promise<UserSummaryItem> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        storeAssignments: {
          include: {
            store: {
              select: { id: true, name: true, storeCode: true },
            },
          },
        },
        regionAssignments: {
          include: {
            region: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      assignedStores: user.storeAssignments.map((sa) => ({
        id: sa.store.id,
        name: sa.store.name,
        storeCode: sa.store.storeCode,
      })),
      assignedRegions: user.regionAssignments.map((ra) => ({
        id: ra.region.id,
        name: ra.region.name,
        code: ra.region.code,
      })),
    };
  }

  async createUser(dto: CreateUserDto, adminId?: string): Promise<UserSummaryItem> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const cleanMobile = dto.mobileNumber.replace(/[\s\-+]/g, '').replace(/^91/, '').replace(/^0/, '');

    // Check unique email and mobile
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException(`A user with email ${normalizedEmail} already exists.`);
    }

    const existingMobile = await this.prisma.user.findUnique({
      where: { mobileNumber: cleanMobile },
    });
    if (existingMobile) {
      throw new ConflictException(`A user with mobile number ${cleanMobile} already exists.`);
    }

    // Role-conditional scope validation
    if (dto.role === RoleType.STORE_MANAGER && (!dto.storeIds || dto.storeIds.length === 0)) {
      throw new BadRequestException('Please assign at least one store for a Store Manager.');
    }
    if (dto.role === RoleType.REGIONAL_MANAGER && (!dto.regionIds || dto.regionIds.length === 0)) {
      throw new BadRequestException('Please assign at least one region for a Regional Manager.');
    }

    const passwordHash = await argon2.hash(dto.initialPassword);

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: dto.fullName.trim(),
          mobileNumber: cleanMobile,
          avatarUrl: dto.avatarUrl || null,
          role: dto.role,
          isActive: true,
        },
      });

      if (dto.role === RoleType.STORE_MANAGER && dto.storeIds?.length) {
        await tx.userStoreAssignment.createMany({
          data: dto.storeIds.map((storeId) => ({
            userId: user.id,
            storeId,
          })),
        });
      }

      if (dto.role === RoleType.REGIONAL_MANAGER && dto.regionIds?.length) {
        await tx.userRegionAssignment.createMany({
          data: dto.regionIds.map((regionId) => ({
            userId: user.id,
            regionId,
          })),
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          correlationId: uuidv4(),
          userId: adminId || null,
          action: 'CREATE_USER',
          entityName: 'User',
          entityId: user.id,
          newValues: JSON.stringify({
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            assignedStoreCount: dto.storeIds?.length || 0,
            assignedRegionCount: dto.regionIds?.length || 0,
          }),
        },
      });

      return user;
    });

    // Query full scope names for email dispatch
    let scopeDescription = 'Unrestricted Enterprise-Wide (All Stores)';
    if (dto.role === RoleType.STORE_MANAGER && dto.storeIds?.length) {
      const stores = await this.prisma.store.findMany({
        where: { id: { in: dto.storeIds } },
        select: { name: true, storeCode: true },
      });
      scopeDescription = stores.map((s) => `${s.name} (${s.storeCode})`).join(', ');
    } else if (dto.role === RoleType.REGIONAL_MANAGER && dto.regionIds?.length) {
      const regions = await this.prisma.region.findMany({
        where: { id: { in: dto.regionIds } },
        select: { name: true, code: true },
      });
      scopeDescription = regions.map((r) => `${r.name} (${r.code})`).join(', ');
    }

    // Send Welcome Credentials Email asynchronously
    const loginUrl = process.env.APP_URL || 'http://localhost:5173/login';
    this.mailService
      .sendWelcomeCredentials({
        toEmail: createdUser.email,
        fullName: createdUser.fullName,
        role: createdUser.role,
        assignedScopeDescription: scopeDescription,
        initialPassword: dto.initialPassword,
        loginUrl,
      })
      .catch((err) => this.logger.error('Failed to dispatch welcome email:', err));

    return this.findById(createdUser.id);
  }

  async updateUser(id: string, dto: UpdateUserDto, adminId?: string): Promise<UserSummaryItem> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    let cleanMobile: string | undefined;
    if (dto.mobileNumber) {
      cleanMobile = dto.mobileNumber.replace(/[\s\-+]/g, '').replace(/^91/, '').replace(/^0/, '');
      if (cleanMobile !== existing.mobileNumber) {
        const conflict = await this.prisma.user.findUnique({
          where: { mobileNumber: cleanMobile },
        });
        if (conflict) {
          throw new ConflictException(`Mobile number ${cleanMobile} is already in use.`);
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
          mobileNumber: cleanMobile,
          role: dto.role,
          isActive: dto.isActive,
          avatarUrl: dto.avatarUrl,
        },
      });

      const effectiveRole = dto.role || existing.role;

      if (dto.storeIds !== undefined) {
        await tx.userStoreAssignment.deleteMany({ where: { userId: id } });
        if (effectiveRole === RoleType.STORE_MANAGER && dto.storeIds.length > 0) {
          await tx.userStoreAssignment.createMany({
            data: dto.storeIds.map((storeId) => ({ userId: id, storeId })),
          });
        }
      }

      if (dto.regionIds !== undefined) {
        await tx.userRegionAssignment.deleteMany({ where: { userId: id } });
        if (effectiveRole === RoleType.REGIONAL_MANAGER && dto.regionIds.length > 0) {
          await tx.userRegionAssignment.createMany({
            data: dto.regionIds.map((regionId) => ({ userId: id, regionId })),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          correlationId: uuidv4(),
          userId: adminId || null,
          action: 'UPDATE_USER',
          entityName: 'User',
          entityId: id,
          oldValues: JSON.stringify({
            fullName: existing.fullName,
            role: existing.role,
            isActive: existing.isActive,
          }),
          newValues: JSON.stringify({
            fullName: dto.fullName,
            role: dto.role,
            isActive: dto.isActive,
          }),
        },
      });
    });

    return this.findById(id);
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
    adminId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newHash },
    });

    await this.prisma.auditLog.create({
      data: {
        correlationId: uuidv4(),
        userId: adminId || null,
        action: 'ADMIN_RESET_PASSWORD',
        entityName: 'User',
        entityId: id,
        newValues: JSON.stringify({ resetTimestamp: new Date().toISOString() }),
      },
    });

    if (dto.sendEmail !== false) {
      const loginUrl = process.env.APP_URL || 'http://localhost:5173/login';
      this.mailService
        .sendPasswordResetNotification({
          toEmail: user.email,
          fullName: user.fullName,
          newPassword: dto.newPassword,
          loginUrl,
        })
        .catch((err) => this.logger.error('Failed to dispatch password reset email:', err));
    }

    return {
      success: true,
      message: 'Password reset successfully and notification dispatched.',
    };
  }

  async toggleStatus(
    id: string,
    isActive: boolean,
    adminId?: string,
  ): Promise<UserSummaryItem> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    await this.prisma.auditLog.create({
      data: {
        correlationId: uuidv4(),
        userId: adminId || null,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityName: 'User',
        entityId: id,
        oldValues: JSON.stringify({ isActive: user.isActive }),
        newValues: JSON.stringify({ isActive }),
      },
    });

    return this.findById(id);
  }
}
