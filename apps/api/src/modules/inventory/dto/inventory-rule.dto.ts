import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class InventoryRuleDto {
  @ApiProperty({
    example: 'a1b2c3d4-1111-4222-8333-102938475601',
    description: 'Target Store UUID for threshold policy',
  })
  @IsUUID()
  storeId!: string;

  @ApiProperty({
    example: 'b2c3d4e5-2222-4333-9444-102938475602',
    description: 'Target Product UUID for threshold policy',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 15.0,
    description: 'Minimum stock floor threshold (@db.Decimal(10, 3))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minimumStock!: number;

  @ApiProperty({
    example: 150.0,
    description: 'Maximum stock ceiling threshold (@db.Decimal(10, 3))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  maximumStock!: number;

  @ApiProperty({
    example: 30.0,
    description: 'Reorder point threshold triggering replenishment (@db.Decimal(10, 3))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  reorderLevel!: number;

  @ApiProperty({
    example: 10.0,
    description: 'Buffer safety stock quantity (@db.Decimal(10, 3))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  safetyStock!: number;

  @ApiPropertyOptional({
    example: '2026-10-26T00:00:00.000Z',
    description: 'Effective start timestamp (defaults to current server time)',
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    example: '2027-03-31T23:59:59.000Z',
    description: 'Optional effective end timestamp for seasonal rules',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
