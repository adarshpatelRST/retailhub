import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import { RoleType } from '@prisma/client';
import {
  ApiResponse,
  AuditInterceptor,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@/core';
import {
  SimulationService,
  SalesSpikeSimulationResult,
} from './simulation.service';
import { SalesSpikeDto } from './dto/sales-spike.dto';
import {
  SeederService,
  SeedDemoResponseDto,
} from './seeds/seeder.service';

export class SeedDemoDto {
  @IsOptional()
  @IsBoolean()
  cleanReset?: boolean;
}

@Controller('simulation')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class SimulationController {
  constructor(
    private readonly simulationService: SimulationService,
    private readonly seederService: SeederService,
  ) {}

  /**
   * POST /api/v1/simulation/sales-spike
   * Restricted to ADMIN role. Triggers a synthetic POS sales spike and returns
   * the generated receipt along with the depleted inventory balance.
   */
  @Post('sales-spike')
  @Roles(RoleType.ADMIN)
  async triggerSalesSpike(
    @Body() dto: SalesSpikeDto,
  ): Promise<ApiResponse<SalesSpikeSimulationResult>> {
    const result = await this.simulationService.triggerSalesSpike(dto);
    return ApiResponse.ok(
      result,
      `Simulated POS sales spike (${result.transaction.transactionNumber}) executed; store stock depleted.`,
    );
  }

  /**
   * POST /api/v1/simulation/seed-demo
   * Restricted to ADMIN role. Executes optional 21-table reverse-dependency reset
   * (`{ cleanReset: true }`), seeds 50 stores, 500 SKUs, 6 months POS sales,
   * and triggers the Bhopal-Indore Golden Path (`REC-1001`).
   */
  @Post('seed-demo')
  @Roles(RoleType.ADMIN)
  async seedDemo(
    @Body() dto: SeedDemoDto,
  ): Promise<ApiResponse<SeedDemoResponseDto>> {
    const result = await this.seederService.seedDemo({
      cleanReset: dto?.cleanReset ?? false,
    });
    return ApiResponse.ok(result, result.message);
  }
}
