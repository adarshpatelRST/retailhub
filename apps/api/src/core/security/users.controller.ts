import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/auth.dto';
import { UsersService, UserSummaryItem } from './users.service';

@ApiTags('Administration: User Management')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
@ApiBearerAuth('JWT-Auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List All Enterprise Users (Admin Only)',
    description:
      'Retrieves the directory of all users, their operational role, active status, and store/region scope assignments.',
  })
  @ApiQuery({ name: 'role', enum: RoleType, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiResponse({ status: 200, description: 'List of users returned successfully.' })
  async findAll(
    @Query('role') role?: RoleType,
    @Query('search') search?: string,
  ): Promise<UserSummaryItem[]> {
    return this.usersService.findAll({ role, search });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get User by ID',
    description: 'Retrieves complete user record with assignments.',
  })
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findById(@Param('id') id: string): Promise<UserSummaryItem> {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Onboard New Manager / User (Admin Only)',
    description:
      'Creates a new user record with role-enforced scopes, hashes password via Argon2, and dispatches an HTML welcome email with initial credentials.',
  })
  @ApiResponse({ status: 201, description: 'User created and credentials dispatched.' })
  @ApiResponse({ status: 409, description: 'Email or mobile number already in use.' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<UserSummaryItem> {
    return this.usersService.createUser(dto, admin.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update User Profile and Scopes',
    description:
      'Updates employee details, changes role, and synchronizes store or regional assignments in a transaction.',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<UserSummaryItem> {
    return this.usersService.updateUser(id, dto, admin.id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin Password Reset',
    description:
      'Resets a user password and optionally emails the new temporary credentials via SMTP.',
  })
  @ApiResponse({ status: 200, description: 'Password reset and email dispatched.' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.resetPassword(id, dto, admin.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or Deactivate User Account',
    description:
      'Toggles active status. Deactivated users are blocked from logging in immediately.',
  })
  @ApiResponse({ status: 200, description: 'User status updated successfully.' })
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<UserSummaryItem> {
    return this.usersService.toggleStatus(id, isActive, admin.id);
  }
}
