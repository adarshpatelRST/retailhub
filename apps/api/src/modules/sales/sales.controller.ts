import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SalesTransaction } from '@prisma/client';
import {
  ApiResponse,
  PaginatedResponse,
  AuditInterceptor,
  DataScope,
  DataScopeGuard,
  JwtAuthGuard,
  StoreScopedFilter,
} from '@/core';
import { SalesService, SaleIngestionResult } from './sales.service';
import { VelocityService } from './velocity.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { BatchSalesDto } from './dto/batch-sales.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { SalesSummaryDto, SalesSummaryQueryDto } from './dto/sales-summary.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly velocityService: VelocityService,
  ) {}

  /**
   * POST /api/v1/sales
   * Ingests a single POS checkout receipt with atomic inventory decrement and movement ledgering.
   */
  @Post()
  async createSale(
    @Body() dto: CreateSaleDto,
  ): Promise<ApiResponse<SaleIngestionResult>> {
    const transaction = await this.salesService.createSale(dto);
    return ApiResponse.ok(
      transaction,
      'POS sales transaction recorded and inventory balance updated.',
    );
  }

  /**
   * POST /api/v1/sales/batch
   * Ingests bulk POS checkout receipts (up to 500 transactions per batch).
   */
  @Post('batch')
  async createBatch(@Body() dto: BatchSalesDto): Promise<
    ApiResponse<{
      processedCount: number;
      successfulTxNumbers: string[];
    }>
  > {
    const result = await this.salesService.createBatch(dto);
    return ApiResponse.ok(
      result,
      `Processed ${result.processedCount} POS transactions in batch.`,
    );
  }

  /**
   * GET /api/v1/sales
   * Paginated POS sales transaction history enforced by DataScopeGuard.
   */
  @Get()
  @UseGuards(DataScopeGuard)
  async findAll(
    @Query() query: SalesQueryDto,
    @DataScope('store') dataScope: StoreScopedFilter,
  ): Promise<ApiResponse<PaginatedResponse<SalesTransaction>>> {
    const paginated = await this.salesService.findAll(query, dataScope);
    return ApiResponse.ok(paginated);
  }

  /**
   * GET /api/v1/sales/summary
   * Aggregated revenue, units sold, transaction count, and average basket value KPIs.
   */
  @Get('summary')
  @UseGuards(DataScopeGuard)
  async getSummary(
    @Query() query: SalesSummaryQueryDto,
    @DataScope('store') dataScope: StoreScopedFilter,
  ): Promise<ApiResponse<SalesSummaryDto>> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const summary = await this.salesService.getSummary(
      query.storeId,
      startDate,
      endDate,
      dataScope,
    );
    return ApiResponse.ok(summary);
  }

  /**
   * GET /api/v1/sales/velocity/:productId?storeId=&windowDays=30
   * Computes rolling Average Daily Sales (ADS) velocity for a store + SKU.
   */
  @Get('velocity/:productId')
  async getProductVelocity(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('storeId') storeId?: string,
    @Query('windowDays') windowDaysRaw?: string,
  ): Promise<
    ApiResponse<{
      storeId: string;
      productId: string;
      windowDays: number;
      averageDailySales: number;
    }>
  > {
    if (!storeId) {
      throw new BadRequestException({
        code: 'SALES_STORE_ID_REQUIRED',
        message: 'Query parameter storeId is required to compute velocity.',
      });
    }

    const parsedWindow = windowDaysRaw ? parseInt(windowDaysRaw, 10) : 30;
    const windowDays =
      Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 30;

    const averageDailySales = await this.velocityService.getAverageDailySales(
      storeId,
      productId,
      windowDays,
    );

    return ApiResponse.ok({
      storeId,
      productId,
      windowDays,
      averageDailySales,
    });
  }
}
