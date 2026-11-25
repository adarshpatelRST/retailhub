import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecPriority, RecStatus, RecType } from '@prisma/client';
import { PaginationDto } from '@/core/dto/pagination.dto';

export class RecommendationQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(RecStatus)
  status?: RecStatus;

  @IsOptional()
  @IsEnum(RecPriority)
  priority?: RecPriority;

  @IsOptional()
  @IsEnum(RecType)
  recommendationType?: RecType;

  @IsOptional()
  @IsUUID('4')
  storeId?: string;

  @IsOptional()
  @IsUUID('4')
  regionId?: string;
}
