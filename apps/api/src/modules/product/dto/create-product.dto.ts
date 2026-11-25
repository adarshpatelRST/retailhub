import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const ALLOWED_UNITS_OF_MEASURE = [
  'PIECE',
  'LITRE',
  'KG',
  'PACK',
] as const;

export type UnitOfMeasureType = (typeof ALLOWED_UNITS_OF_MEASURE)[number];

export class CreateProductDto {
  @ApiProperty({
    example: 'SKU-1024',
    description: 'Unique stock keeping unit identifier (automatically uppercased)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  sku!: string;

  @ApiProperty({
    example: '8901030383742',
    description: 'Unique EAN-13 / UPC physical barcode string for handheld scanners',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  productCode!: string;

  @ApiProperty({
    example: 'Daawat Rozana Super Basmati Rice 5kg',
    description: 'Display name of the retail product',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({
    example: 'Aged everyday basmati rice ideal for high-velocity family packs',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: 'd4f8a910-1234-4b89-9c01-102938475601',
    description: 'Foreign key UUID of the Brand',
  })
  @IsUUID()
  brandId!: string;

  @ApiProperty({
    example: 'c3e7b820-5678-4a12-8d02-102938475602',
    description: 'Foreign key UUID of the Category',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    example: 'PACK',
    enum: ALLOWED_UNITS_OF_MEASURE,
    description: 'Standard inventory unit of measure (PIECE, LITRE, KG, PACK)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(ALLOWED_UNITS_OF_MEASURE)
  unitOfMeasure!: string;

  @ApiProperty({
    example: 310.0,
    description: 'Unit procurement landed cost price (@db.Decimal(12, 2))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice!: number;

  @ApiProperty({
    example: 389.0,
    description: 'Store discounted selling price (@db.Decimal(12, 2))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPrice!: number;

  @ApiPropertyOptional({
    example: 445.0,
    description:
      'Maximum Retail Price printed on packaging (@db.Decimal(12, 2)). Defaults to sellingPrice if omitted.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mrp?: number;
}

export class BatchCreateProductDto {
  @ApiProperty({
    type: () => [CreateProductDto],
    description: 'Array of products to upsert by SKU (up to 1,000 rows per chunk)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products!: CreateProductDto[];
}
