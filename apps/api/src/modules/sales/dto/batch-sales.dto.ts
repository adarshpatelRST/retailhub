import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

export class BatchSalesDto {
  /**
   * Bulk POS checkout transactions array (1 to 500 receipts per batch sync).
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDto)
  transactions!: CreateSaleDto[];
}
