import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { STRONG_PASSWORD_REGEX } from './auth.dto';

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export class CreateUserDto {
  @ApiProperty({
    description: 'Full legal name of the employee/manager',
    example: 'Rajesh Sharma',
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName!: string;

  @ApiProperty({
    description: 'Unique corporate email address',
    example: 'store.bhopal@retailhub.com',
  })
  @IsEmail({}, { message: 'Please provide a valid corporate email' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    description: '10-digit Indian mobile phone number',
    example: '9820112233',
  })
  @IsString()
  @Transform(({ value }: { value: string }) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/[\s\-+]/g, '')
      .replace(/^91/, '')
      .replace(/^0/, '');
  })
  @Matches(INDIAN_MOBILE_REGEX, {
    message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9',
  })
  mobileNumber!: string;

  @ApiProperty({
    description: 'Operational role authority',
    enum: RoleType,
    example: RoleType.STORE_MANAGER,
  })
  @IsEnum(RoleType, { message: 'Invalid role type selected' })
  role!: RoleType;

  @ApiProperty({
    description: 'Initial password to be assigned and emailed to the user',
    example: 'StoreManager@2025!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(STRONG_PASSWORD_REGEX, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  initialPassword!: string;

  @ApiPropertyOptional({
    description: 'Assigned store IDs for STORE_MANAGER role',
    type: [String],
    example: ['store-bpl-001'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storeIds?: string[];

  @ApiPropertyOptional({
    description: 'Assigned region IDs for REGIONAL_MANAGER role',
    type: [String],
    example: ['reg-central-mp'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regionIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional avatar URL',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Updated full name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Updated 10-digit Indian mobile number',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/[\s\-+]/g, '')
      .replace(/^91/, '')
      .replace(/^0/, '');
  })
  @Matches(INDIAN_MOBILE_REGEX, {
    message: 'Mobile number must be a valid 10-digit Indian number',
  })
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'Updated role',
    enum: RoleType,
  })
  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @ApiPropertyOptional({
    description: 'Active status of the user',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Synchronized assigned store IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storeIds?: string[];

  @ApiPropertyOptional({
    description: 'Synchronized assigned region IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regionIds?: string[];

  @ApiPropertyOptional({
    description: 'Updated avatar URL',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
