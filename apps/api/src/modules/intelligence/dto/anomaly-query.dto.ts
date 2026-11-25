import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AnomalyQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsString()
  @IsIn(['CRITICAL', 'LOW', 'HEALTHY', 'EXCESS'])
  status?: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS';
}

export class StockAnomalyItemDto {
  inventoryId!: string;
  storeId!: string;
  storeCode!: string;
  storeName!: string;
  regionId!: string;
  regionCode!: string;
  productId!: string;
  sku!: string;
  productName!: string;
  availableStock!: number;
  reorderLevel!: number;
  maximumStock!: number;
  ads!: number;
  doi!: number;
  risk!: 'HIGH' | 'MEDIUM' | 'LOW';
  status!: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS';
}
