import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse as SwaggerResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../security/jwt-auth.guard';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Verify API and Microsoft SQL Server database connectivity',
    description:
      'Executes a Terminus health check probing the Microsoft SQL Server connection pool via Prisma ORM at GET /api/v1/health.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Microsoft SQL Server and API runtime are healthy.',
  })
  @SwaggerResponse({
    status: 503,
    description: 'Database connectivity check failed.',
  })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> =>
        this.prismaHealth.pingCheck('mssql_database', this.prisma, {
          timeout: 3000,
        }),
    ]);
  }
}
