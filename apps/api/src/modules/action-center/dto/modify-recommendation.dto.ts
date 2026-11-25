import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class ModifyRecommendationDto {
  @IsOptional()
  @IsUUID('4')
  sourceStoreId?: string;

  @IsNumber()
  @Min(1)
  modifiedQuantity!: number;

  @IsString()
  @MinLength(5, { message: 'Comments are mandatory when modifying a recommendation' })
  comments!: string;
}
