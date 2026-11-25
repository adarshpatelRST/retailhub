import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { RecPriority } from '@prisma/client';

export class CreateStoreRequestDto {
  @IsUUID('4')
  toStoreId!: string;

  @IsUUID('4')
  productId!: string;

  @IsNumber()
  @Min(1)
  requestedQuantity!: number;

  @IsOptional()
  @IsEnum(RecPriority)
  priority?: RecPriority = RecPriority.HIGH;

  @IsString()
  @MinLength(5)
  reason!: string;
}
