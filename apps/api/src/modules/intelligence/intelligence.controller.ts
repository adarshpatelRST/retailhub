import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RoleType } from '@prisma/client';
import {
  ApiResponse,
  AuditInterceptor,
  AuthenticatedUser,
  CurrentUser,
  DataScope,
  DataScopeGuard,
  JwtAuthGuard,
  PaginatedResponse,
  Roles,
  RolesGuard,
  StoreScopedFilter,
} from '@/core';
import { RebalanceService } from './services/rebalance.service';
import { EvaluationResultDto } from './dto/evaluation-result.dto';
import { CandidateStoreDto } from './dto/candidate-store.dto';
import { AnomalyQueryDto, StockAnomalyItemDto } from './dto/anomaly-query.dto';

@Controller('intelligence')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class IntelligenceController {
  constructor(private readonly rebalanceService: RebalanceService) {}

  /**
   * POST /api/v1/intelligence/evaluate/store/:storeId
   * Tier 1 Store-level scan. Accessible by STORE_MANAGER (for assigned store),
   * REGIONAL_MANAGER (for stores in assigned region), EXECUTIVE, and ADMIN.
   */
  @Post('evaluate/store/:storeId')
  @UseGuards(DataScopeGuard)
  @Roles(
    RoleType.STORE_MANAGER,
    RoleType.REGIONAL_MANAGER,
    RoleType.EXECUTIVE,
    RoleType.ADMIN,
  )
  async evaluateStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @DataScope('store') dataScope: StoreScopedFilter,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<EvaluationResultDto>> {
    if (user.role === RoleType.STORE_MANAGER) {
      const allowedStores = dataScope.id?.in ?? dataScope.storeId?.in ?? [];
      if (!allowedStores.includes(storeId)) {
        throw new ForbiddenException({
          code: 'INTEL_STORE_OUT_OF_SCOPE',
          message: `Store manager '${user.email}' is not assigned to store '${storeId}'.`,
        });
      }
    }

    const result = await this.rebalanceService.evaluateStore(storeId);
    return ApiResponse.ok(
      result,
      `Completed store-level intelligence evaluation for store '${storeId}'.`,
    );
  }

  /**
   * POST /api/v1/intelligence/evaluate/region/:regionId
   * Tier 2 Region-level scan. Accessible by REGIONAL_MANAGER (for assigned region),
   * EXECUTIVE, and ADMIN. Forbidden (403) to STORE_MANAGER.
   */
  @Post('evaluate/region/:regionId')
  @UseGuards(DataScopeGuard)
  @Roles(RoleType.REGIONAL_MANAGER, RoleType.EXECUTIVE, RoleType.ADMIN)
  async evaluateRegion(
    @Param('regionId', ParseUUIDPipe) regionId: string,
    @DataScope('store') dataScope: StoreScopedFilter,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<EvaluationResultDto>> {
    if (user.role === RoleType.REGIONAL_MANAGER) {
      const allowedRegions =
        dataScope.regionId?.in ?? dataScope.store?.regionId?.in ?? [];
      if (!allowedRegions.includes(regionId)) {
        throw new ForbiddenException({
          code: 'INTEL_REGION_OUT_OF_SCOPE',
          message: `Regional manager '${user.email}' is not assigned to region '${regionId}'.`,
        });
      }
    }

    const result = await this.rebalanceService.evaluateRegion(regionId);
    return ApiResponse.ok(
      result,
      `Completed region-level intelligence evaluation for region '${regionId}'.`,
    );
  }

  /**
   * POST /api/v1/intelligence/evaluate/enterprise
   * Tier 3 Enterprise-level scan. Strictly restricted to EXECUTIVE and ADMIN roles.
   */
  @Post('evaluate/enterprise')
  @Roles(RoleType.EXECUTIVE, RoleType.ADMIN)
  async evaluateEnterprise(): Promise<ApiResponse<EvaluationResultDto>> {
    const result = await this.rebalanceService.evaluateEnterprise();
    return ApiResponse.ok(
      result,
      'Completed enterprise-wide intelligence rebalance evaluation.',
    );
  }

  /**
   * GET /api/v1/intelligence/anomalies
   * Returns high-risk stock-outs and trapped excess inventory enforced by DataScopeGuard.
   */
  @Get('anomalies')
  @UseGuards(DataScopeGuard)
  async getAnomalies(
    @Query() query: AnomalyQueryDto,
    @DataScope('inventory') dataScope: StoreScopedFilter,
  ): Promise<ApiResponse<PaginatedResponse<StockAnomalyItemDto>>> {
    const paginated = await this.rebalanceService.findAnomalies(
      query,
      dataScope,
    );
    return ApiResponse.ok(paginated);
  }

  /**
   * GET /api/v1/intelligence/candidates/:recommendationId
   * Returns ranked regional donor store candidates for a specific recommendation.
   */
  @Get('candidates/:recommendationId')
  async getCandidates(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
  ): Promise<ApiResponse<CandidateStoreDto[]>> {
    const candidates =
      await this.rebalanceService.getCandidatesForRecommendation(
        recommendationId,
      );
    return ApiResponse.ok(candidates);
  }
}
