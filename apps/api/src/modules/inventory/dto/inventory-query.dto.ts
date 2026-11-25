import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const STOCK_HEALTH_STATUSES = [
  'CRITICAL',
  'LOW',
  'HEALTHY',
  'EXCESS',
] as const;

export type StockHealthStatus = (typeof STOCK_HEALTH_STATUSES)[number];

export class InventoryQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: '1-based page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Number of inventory records per page (max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-1111-4222-8333-102938475601',
    description: 'Filter balances by Store UUID',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-2222-4333-9444-102938475602',
    description: 'Filter balances by Product UUID',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    example: 'LOW',
    enum: STOCK_HEALTH_STATUSES,
    description:
      'Filter by computed stock health status (CRITICAL, LOW, HEALTHY, EXCESS)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(STOCK_HEALTH_STATUSES)
  status?: StockHealthStatus;

  @ApiPropertyOptional({
    example: 'SKU-1024',
    description: 'Search by product SKU, barcode (productCode), or product name',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}
