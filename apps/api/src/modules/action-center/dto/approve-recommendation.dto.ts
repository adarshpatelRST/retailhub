import { IsOptional, IsString } from 'class-validator';

export class ApproveRecommendationDto {
  @IsOptional()
  @IsString()
  comments?: string;
}
