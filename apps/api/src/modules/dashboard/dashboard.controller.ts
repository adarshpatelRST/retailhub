import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleType } from '@prisma/client';
import {
  ApiResponse,
  DataScope,
  DataScopeGuard,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  StoreScopedFilter,
} from '@/core';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { ExecutiveDashboardDto } from './dto/executive-dashboard.dto';
import { StoreDashboardDto } from './dto/store-dashboard.dto';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, RolesGuard, DataScopeGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/v1/dashboards/executive
   * Restricted to EXECUTIVE and ADMIN roles.
   * Returns 6 enterprise KPIs, 5 Recharts datasets, and dynamic exception callouts.
   */
  @Get('executive')
  @Roles(RoleType.EXECUTIVE, RoleType.ADMIN)
  async getExecutiveDashboard(
    @Query() query: DashboardQueryDto,
  ): Promise<ApiResponse<ExecutiveDashboardDto>> {
    const result = await this.dashboardService.getExecutiveDashboard(query);
    return ApiResponse.ok(
      result,
      result.cached
        ? 'Executive dashboard served from 60-second in-memory cache.'
        : 'Executive dashboard aggregated from live SQL store and POS metrics.',
    );
  }

  /**
   * GET /api/v1/dashboards/store/:storeId
   * Protected by JwtAuthGuard and DataScopeGuard with @DataScope('store').
   */
  @Get('store/:storeId')
  @Roles(
    RoleType.ADMIN,
    RoleType.EXECUTIVE,
    RoleType.REGIONAL_MANAGER,
    RoleType.STORE_MANAGER,
  )
  async getStoreDashboard(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @DataScope('store') dataScope: StoreScopedFilter,
  ): Promise<ApiResponse<StoreDashboardDto>> {
    const result = await this.dashboardService.getStoreDashboard(
      storeId,
      dataScope,
    );
    return ApiResponse.ok(
      result,
      `Store dashboard loaded for ${result.store.storeCode}.`,
    );
  }
}
