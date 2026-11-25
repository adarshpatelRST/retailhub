import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({
    example: 'BRD-DAAWAT',
    description: 'Unique uppercase brand code',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({
    example: 'Daawat Foods',
    description: 'Brand display name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
}
