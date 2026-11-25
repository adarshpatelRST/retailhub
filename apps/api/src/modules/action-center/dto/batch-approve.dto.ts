import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class BatchApproveDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  recommendationIds!: string[];

  @IsOptional()
  @IsString()
  comments?: string;
}
