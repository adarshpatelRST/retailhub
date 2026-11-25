import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import {
  CurrentUser,
  DataScope,
  DataScopeGuard,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  StoreScopedFilter,
} from '@/core';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { InventoryRuleDto } from './dto/inventory-rule.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory & Double-Entry Ledger')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory')
  @UseGuards(JwtAuthGuard, DataScopeGuard)
  @ApiOperation({
    summary:
      'List store inventory balances with dynamic stock health status (CRITICAL, LOW, HEALTHY, EXCESS)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated list of scoped inventory balances.',
  })
  async findAll(
    @Query() query: InventoryQueryDto,
    @DataScope('inventory') dataScope: StoreScopedFilter,
  ) {
    return this.inventoryService.findAll(query, dataScope);
  }

  @Get('inventory/:storeId/:productId')
  @ApiOperation({
    summary:
      'Get store-product balance (lazily initializes a 0.000 balance row at version 1 if missing)',
  })
  @SwaggerResponse({ status: 200, description: 'Inventory balance row.' })
  async getBalance(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.inventoryService.getBalance(storeId, productId);
  }

  @Get('inventory/:storeId/:productId/movements')
  @ApiOperation({
    summary: 'Get immutable double-entry ledger history (InventoryMovement)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated InventoryMovement ledger rows.',
  })
  async getMovements(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getMovements(
      storeId,
      productId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Post('inventory/adjust')
  @Roles(RoleType.STORE_MANAGER, RoleType.ADMIN)
  @ApiOperation({
    summary:
      'Perform optimistic-locked manual stock adjustment or damaged write-off (STORE_MANAGER, ADMIN)',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Updated Inventory row and immutable InventoryMovement entry.',
  })
  @SwaggerResponse({
    status: 409,
    description: 'Optimistic lock version mismatch (INV_CONCURRENCY_CONFLICT).',
  })
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Get('inventory-rules')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'List active Min/Max/Reorder/SafetyStock threshold rules (ADMIN only)',
  })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  async getRules(
    @Query('storeId') storeId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getRules(storeId, productId);
  }

  @Post('inventory-rules')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary:
      'Create a new SCD Type 2 versioned InventoryRule and expire previous active rule (ADMIN only)',
  })
  @SwaggerResponse({ status: 201, description: 'New InventoryRule created.' })
  async saveRule(@Body() dto: InventoryRuleDto) {
    return this.inventoryService.saveRule(dto);
  }
}
