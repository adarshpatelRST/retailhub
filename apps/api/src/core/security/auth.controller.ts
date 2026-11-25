import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { CurrentUser, AuthenticatedUser } from './current-user.decorator';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Corporate Single Sign-On / Credential Login',
    description:
      'Validates corporate email and password via Argon2, enforces active status, and returns a signed JWT with role and assigned scopes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authenticated successfully. Returns JWT access token and user profile.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Account deactivated by System Administrator.',
  })
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
  ): Promise<AuthResponse> {
    return this.authService.login(dto, ipAddress);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({
    summary: 'Get Authenticated User Profile',
    description:
      'Returns the operational profile, role authority, and assigned store/region IDs for the currently signed-in user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully.',
  })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuthResponse['user']> {
    return this.authService.getMe(user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change Account Password (Self-Service)',
    description:
      'Allows an authenticated manager or executive to update their account password after validating their current password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Current password incorrect.',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Ip() ipAddress: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.changePassword(user.id, dto, ipAddress);
  }
}
