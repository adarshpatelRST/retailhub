import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class StoreQueryDto {
  @ApiPropertyOptional({
    example: 'f1a2b3c4-1111-4222-8333-102938475601',
    description: 'Filter stores by operational Region UUID',
  })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({
    example: 'e5d6c7b8-2222-4333-9444-102938475602',
    description: 'Filter stores by StoreType UUID',
  })
  @IsOptional()
  @IsUUID()
  storeTypeId?: string;

  @ApiPropertyOptional({
    example: 'Bhopal',
    description: 'Filter stores by city name',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Filter by active status (defaults to true)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  })
  @IsBoolean()
  isActive?: boolean = true;
}
