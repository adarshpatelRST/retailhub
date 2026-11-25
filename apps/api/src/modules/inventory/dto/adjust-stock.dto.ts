import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({
    example: 'a1b2c3d4-1111-4222-8333-102938475601',
    description: 'Store UUID where physical stock adjustment occurs',
  })
  @IsUUID()
  storeId!: string;

  @ApiProperty({
    example: 'b2c3d4e5-2222-4333-9444-102938475602',
    description: 'Product UUID being adjusted',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: -4.5,
    description:
      'Signed quantity delta (@db.Decimal(10, 3)): positive for cycle count additions, negative for damaged write-offs',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @NotEquals(0, { message: 'quantityDelta cannot be zero.' })
  quantityDelta!: number;

  @ApiProperty({
    example: 'Physical audit variance / Broken jar write-off',
    maxLength: 255,
    description: 'Mandatory audit reason for manual inventory adjustment',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks!: string;

  @ApiProperty({
    example: 1,
    description:
      'Expected optimistic lock version of the Inventory row (throws INV_CONCURRENCY_CONFLICT on mismatch)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
