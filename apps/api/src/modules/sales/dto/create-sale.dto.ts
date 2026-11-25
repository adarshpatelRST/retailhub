import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleLineDto {
  @IsUUID()
  productId!: string;

  /**
   * Quantity sold on this line item (@db.Decimal(10, 3)).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  /**
   * Point-in-time unit selling price snapshot (@db.Decimal(12, 2)).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  /**
   * Line-level promotional or manual discount snapshot (@db.Decimal(12, 2)).
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number = 0.0;

  /**
   * Final billed line amount after discount (@db.Decimal(12, 2)).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netAmount!: number;
}

export class CreateSaleDto {
  /**
   * Unique POS invoice/receipt code (e.g., "POS-BPL-20261022-0001").
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  transactionNumber!: string;

  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsISO8601()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines!: CreateSaleLineDto[];
}
