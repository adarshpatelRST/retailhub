import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class DispatchTransferDto {
  @ApiPropertyOptional({
    example: 'Mahindra Logistics Cold-Chain Express',
    maxLength: 150,
    description: 'Logistics carrier or fleet operator name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  carrierName?: string;

  @ApiPropertyOptional({
    example: 'MH-04-le-8821',
    maxLength: 50,
    description: 'Commercial vehicle registration number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  vehicleNumber?: string;

  @ApiPropertyOptional({
    example: 'DN-WEST-2026-00942',
    maxLength: 50,
    description: 'Physical delivery challan / dispatch note number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  dispatchNoteNumber?: string;

  @ApiPropertyOptional({
    example: '2026-10-27T14:30:00.000Z',
    description: 'Estimated time of arrival (ISO-8601 timestamp)',
  })
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;
}
