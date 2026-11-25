import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Soft-delete or reactivation flag for the product record',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
