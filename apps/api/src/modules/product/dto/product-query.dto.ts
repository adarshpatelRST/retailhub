import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ProductQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: '1-based page number for catalog pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Page size limit (default 20, max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: '8901030383742',
    description:
      'Barcode-first search query: checks exact productCode match first before falling back to partial name or SKU match',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    example: 'c3e7b820-5678-4a12-8d02-102938475602',
    description: 'Filter products by Category UUID',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'd4f8a910-1234-4b89-9c01-102938475601',
    description: 'Filter products by Brand UUID',
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

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
