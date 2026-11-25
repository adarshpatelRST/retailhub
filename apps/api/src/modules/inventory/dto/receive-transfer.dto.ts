import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceiveTransferLineDto {
  @ApiProperty({
    example: 'b2c3d4e5-2222-4333-9444-102938475602',
    description: 'Product UUID being received at the destination store',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 48.0,
    description:
      'Actual physical quantity received (@db.Decimal(10, 3)). If less than approved/requested quantity, the shortfall is automatically written off as DAMAGED_WRITE_OFF.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  receivedQty!: number;
}

export class ReceiveTransferDto {
  @ApiProperty({
    type: () => [ReceiveTransferLineDto],
    description: 'Line-by-line physical quantities scanned at destination dock',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferLineDto)
  lines!: ReceiveTransferLineDto[];

  @ApiPropertyOptional({
    example: '2 units damaged in transit outer carton crush',
    maxLength: 255,
    description: 'Optional remarks for inward receipt or shortfall explanation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;
}

export class CancelTransferDto {
  @ApiProperty({
    example: 'Dispatch vehicle breakdown; re-routing from nearer fulfilment hub',
    maxLength: 255,
    description: 'Mandatory reason for cancelling the stock transfer',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason!: string;
}
