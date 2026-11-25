import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export class LoginDto {
  @ApiProperty({
    description: 'Corporate work email address',
    example: 'admin@retailhub.com',
  })
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    description: 'Account password',
    example: 'Admin@2025!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @ApiProperty({
    description:
      'New password (minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)',
    example: 'NewSecure@Pass123',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(STRONG_PASSWORD_REGEX, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  newPassword!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'New initial or reset password assigned by Administrator',
    example: 'TempAdmin@2025!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(STRONG_PASSWORD_REGEX, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  newPassword!: string;

  @ApiPropertyOptional({
    description: 'Whether to email updated credentials to the user via SMTP',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
