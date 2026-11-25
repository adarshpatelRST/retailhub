import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'CAT-STAPLES',
    description: 'Unique uppercase category taxonomy code',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({
    example: 'Grocery & Staples',
    description: 'Human-readable category display name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-1111-4222-8333-444455556666',
    description: 'Optional parent category UUID for hierarchical subcategories',
  })
  @IsOptional()
  @IsUUID()
  parentCategoryId?: string;
}

export class CategoryTreeNodeDto {
  @ApiProperty({ example: 'a1b2c3d4-1111-4222-8333-444455556666' })
  id!: string;

  @ApiProperty({ example: 'CAT-STAPLES' })
  code!: string;

  @ApiProperty({ example: 'Grocery & Staples' })
  name!: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  parentCategoryId!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-10-26T09:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    type: () => [CategoryTreeNodeDto],
    description: 'Recursively populated child subcategories',
  })
  subCategories!: CategoryTreeNodeDto[];
}
