import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class SalesSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class SalesSummaryDto {
  storeId!: string | null;
  startDate!: string | null;
  endDate!: string | null;
  /**
   * Total net revenue formatted to @db.Decimal(12, 2).
   */
  totalRevenue!: string;
  /**
   * Total physical units sold formatted to @db.Decimal(10, 3).
   */
  totalUnitsSold!: string;
  /**
   * Total count of distinct POS checkout invoices.
   */
  totalTransactionCount!: number;
  /**
   * Mean invoice value (totalRevenue / totalTransactionCount) formatted to @db.Decimal(12, 2).
   */
  averageBasketValue!: string;
}
