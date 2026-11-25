import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page index (1-based)' })
  page!: number;

  @ApiProperty({ example: 25, description: 'Number of records per page' })
  limit!: number;

  @ApiProperty({ example: 142, description: 'Total matching records' })
  totalItems!: number;

  @ApiProperty({ example: 6, description: 'Total available pages' })
  totalPages!: number;

  @ApiProperty({ example: true, description: 'Whether a next page exists' })
  hasNextPage!: boolean;

  @ApiProperty({ example: false, description: 'Whether a previous page exists' })
  hasPreviousPage!: boolean;

  constructor(page: number, limit: number, totalItems: number) {
    this.page = Math.max(1, page);
    this.limit = Math.max(1, limit);
    this.totalItems = Math.max(0, totalItems);
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.limit));
    this.hasNextPage = this.page < this.totalPages;
    this.hasPreviousPage = this.page > 1;
  }
}

export class PaginatedResponse<T> {
  @ApiProperty({ isArray: true, description: 'Page items' })
  items!: T[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;

  constructor(items: T[], totalItems: number, page = 1, limit = 25) {
    this.items = items;
    this.meta = new PaginationMetaDto(page, limit, totalItems);
  }
}

export class ApiResponse<T> {
  @ApiProperty({ example: true, description: 'Indicates successful execution' })
  success!: boolean;

  @ApiProperty({ description: 'Response payload data' })
  data!: T;

  @ApiPropertyOptional({
    type: () => PaginationMetaDto,
    description: 'Pagination metadata when returning paginated lists',
  })
  meta?: PaginationMetaDto;

  @ApiProperty({
    example: 'b4a9c8e2-710f-4d1c-8391-5839a20b9f11',
    description: 'Distributed request correlation identifier (UUID v4)',
  })
  correlationId!: string;

  @ApiProperty({
    example: '2026-10-26T09:00:00.000Z',
    description: 'ISO-8601 server timestamp in UTC',
  })
  timestamp!: string;

  constructor(params: {
    data: T;
    correlationId: string;
    meta?: PaginationMetaDto;
    timestamp?: string;
  }) {
    this.success = true;
    this.data = params.data;
    if (params.meta) {
      this.meta = params.meta;
    }
    this.correlationId = params.correlationId;
    this.timestamp = params.timestamp ?? new Date().toISOString();
  }
}
