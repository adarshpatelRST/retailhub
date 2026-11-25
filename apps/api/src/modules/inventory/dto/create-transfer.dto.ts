import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTransferLineDto {
  @ApiProperty({
    example: 'b2c3d4e5-2222-4333-9444-102938475602',
    description: 'Product UUID to transfer',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 50.0,
    description: 'Requested transfer quantity (@db.Decimal(10, 3))',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  requestedQty!: number;
}

export class CreateTransferDto {
  @ApiProperty({
    example: 'a1b2c3d4-1111-4222-8333-102938475601',
    description: 'Source (dispatching) Store UUID',
  })
  @IsUUID()
  fromStoreId!: string;

  @ApiProperty({
    example: 'c3d4e5f6-3333-4444-9555-102938475603',
    description: 'Destination (receiving) Store UUID',
  })
  @IsUUID()
  toStoreId!: string;

  @ApiProperty({
    type: () => [CreateTransferLineDto],
    description: 'Line items requested for inter-store stock transfer (min 1 line)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransferLineDto)
  lines!: CreateTransferLineDto[];
}
