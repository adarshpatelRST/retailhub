import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class SalesSpikeDto {
  @IsUUID()
  storeId!: string;

  @IsUUID()
  productId!: string;

  /**
   * Synthetic units to deplete in a single simulated POS burst (@db.Decimal(10, 3), min 1).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(1)
  unitsToSell!: number;
}
