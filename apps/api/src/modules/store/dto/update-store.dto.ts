import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateStoreDto } from './create-store.dto';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Soft-delete or reactivation flag for the store record',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
