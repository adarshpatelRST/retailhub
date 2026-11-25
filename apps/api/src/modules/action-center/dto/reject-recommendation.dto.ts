import { IsString, MinLength } from 'class-validator';

export class RejectRecommendationDto {
  @IsString()
  @MinLength(5, { message: 'A rejection reason of at least 5 characters is mandatory' })
  reason!: string;
}
