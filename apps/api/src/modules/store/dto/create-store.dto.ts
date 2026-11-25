import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStoreDto {
  @ApiProperty({
    example: 'BPL-001',
    description: 'Unique uppercase store code identifier',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  storeCode!: string;

  @ApiProperty({
    example: 'Bhopal MP Nagar Store',
    description: 'Official retail store name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiProperty({
    example: 'f1a2b3c4-1111-4222-8333-102938475601',
    description: 'Foreign key UUID of the operational Region',
  })
  @IsUUID()
  regionId!: string;

  @ApiProperty({
    example: 'e5d6c7b8-2222-4333-9444-102938475602',
    description: 'Foreign key UUID of the StoreType (HYPERMARKET, SUPERMARKET, EXPRESS)',
  })
  @IsUUID()
  storeTypeId!: string;

  @ApiProperty({
    example: 'Bhopal',
    description: 'City name for store location',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city!: string;

  @ApiPropertyOptional({
    example: 'Plot 14, Zone-II, Maharana Pratap Nagar, Bhopal 462011',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({
    example: 23.233245,
    description:
      'Optional dynamic latitude coordinate from frontend geolocation permissions (-90 to 90)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: 77.434321,
    description:
      'Optional dynamic longitude coordinate from frontend geolocation permissions (-180 to 180)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    example: '2024-04-15',
    description: 'Store opening date in ISO-8601 format (YYYY-MM-DD)',
  })
  @IsDateString()
  openingDate!: string;
}
