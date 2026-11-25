import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    mobileNumber: string;
    avatarUrl: string | null;
    role: string;
    assignedStoreIds: string[];
    assignedRegionIds: string[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        storeAssignments: true,
        regionAssignments: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Account has been deactivated. Please contact your RetailHub System Administrator.',
      );
    }

    const assignedStoreIds = user.storeAssignments.map((a) => a.storeId);
    const assignedRegionIds = user.regionAssignments.map((a) => a.regionId);

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      assignedStoreIds,
      assignedRegionIds,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    // Record LOGIN action in AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          correlationId: uuidv4(),
          userId: user.id,
          action: 'LOGIN',
          entityName: 'User',
          entityId: user.id,
          newValues: JSON.stringify({
            email: user.email,
            role: user.role,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: ipAddress || '127.0.0.1',
        },
      });
    } catch (auditErr) {
      this.logger.warn('Failed to record login audit log:', auditErr);
    }

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
        assignedStoreIds,
        assignedRegionIds,
      },
    };
  }

  async getMe(userId: string): Promise<AuthResponse['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeAssignments: true,
        regionAssignments: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      avatarUrl: user.avatarUrl,
      role: user.role,
      assignedStoreIds: user.storeAssignments.map((a) => a.storeId),
      assignedRegionIds: user.regionAssignments.map((a) => a.regionId),
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isCurrentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password does not match.');
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Record CHANGE_PASSWORD in AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          correlationId: uuidv4(),
          userId,
          action: 'CHANGE_PASSWORD',
          entityName: 'User',
          entityId: userId,
          oldValues: JSON.stringify({ passwordHashUpdated: true }),
          newValues: JSON.stringify({
            updatedAt: new Date().toISOString(),
          }),
          ipAddress: ipAddress || '127.0.0.1',
        },
      });
    } catch (auditErr) {
      this.logger.warn('Failed to record password change audit log:', auditErr);
    }

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }
}
