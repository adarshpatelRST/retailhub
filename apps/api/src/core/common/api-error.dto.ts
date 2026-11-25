import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetail {
  @ApiProperty({ example: 'CONFLICT_UNIQUE_CONSTRAINT' })
  code!: string;

  @ApiProperty({
    example: 'A record with the provided unique identifier already exists.',
  })
  message!: string;

  @ApiPropertyOptional({
    example: ['sku', 'storeCode'],
    description: 'Validation errors or conflicting database column names',
  })
  details?: unknown;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ type: () => ApiErrorDetail })
  error!: ApiErrorDetail;

  @ApiProperty({ example: '/api/v1/inventory/adjust' })
  path!: string;

  @ApiProperty({ example: 'POST' })
  method!: string;

  @ApiProperty({
    example: 'b4a9c8e2-710f-4d1c-8391-5839a20b9f11',
    description: 'Request correlation ID for end-to-end distributed tracing',
  })
  correlationId!: string;

  @ApiProperty({
    example: '2026-10-26T09:00:00.000Z',
    description: 'ISO-8601 server timestamp in UTC',
  })
  timestamp!: string;

  constructor(params: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
    path: string;
    method: string;
    correlationId: string;
    timestamp?: string;
  }) {
    this.success = false;
    this.statusCode = params.statusCode;
    this.error = {
      code: params.code,
      message: params.message,
      ...(params.details !== undefined ? { details: params.details } : {}),
    };
    this.path = params.path;
    this.method = params.method;
    this.correlationId = params.correlationId;
    this.timestamp = params.timestamp ?? new Date().toISOString();
  }
}
