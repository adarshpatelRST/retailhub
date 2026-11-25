import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({
    example: 'REG-CENTRAL',
    description: 'Unique uppercase operational region code',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({
    example: 'Central India Operations',
    description: 'Operational region display name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
}

export class StoreNetworkContactDto {
  @ApiProperty({ example: 'Rajesh Sharma' })
  fullName!: string;

  @ApiProperty({ example: 'rajesh.sharma@retailhub.in' })
  email!: string;

  @ApiProperty({ example: '+91-98201-12233' })
  mobileNumber!: string;
}

export class StoreNetworkDirectoryItemDto {
  @ApiProperty({ example: 'store-mum-001' })
  id!: string;

  @ApiProperty({ example: 'BPL-001' })
  storeCode!: string;

  @ApiProperty({ example: 'Bhopal MP Nagar Store' })
  name!: string;

  @ApiProperty({ example: 'Bhopal' })
  city!: string;

  @ApiPropertyOptional({
    example: 'Plot 14, Zone-II, Maharana Pratap Nagar, Bhopal 462011',
    nullable: true,
  })
  address!: string | null;

  @ApiPropertyOptional({ example: 23.233245, nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ example: 77.434321, nullable: true })
  longitude!: number | null;

  @ApiProperty({
    example: { id: 'reg-central', code: 'REG-CENTRAL', name: 'Central India' },
  })
  region!: {
    id: string;
    code: string;
    name: string;
  };

  @ApiProperty({
    example: { id: 'type-hyper', code: 'HYPERMARKET', name: 'Hypermarket' },
  })
  storeType!: {
    id: string;
    code: string;
    name: string;
  };

  @ApiPropertyOptional({
    example: '+91-98201-12233',
    nullable: true,
    description: 'Primary store contact mobile number from assigned store manager',
  })
  contactMobileNumber!: string | null;

  @ApiProperty({
    type: () => [StoreNetworkContactDto],
    description: 'Assigned store managers for peer store coordination',
  })
  storeManagers!: StoreNetworkContactDto[];
}
