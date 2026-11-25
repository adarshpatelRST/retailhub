import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
  DataScope,
  DataScopeGuard,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  StoreScopedFilter,
} from '@/core';
import { CreateStoreDto } from './dto/create-store.dto';
import {
  CreateRegionDto,
  StoreNetworkDirectoryItemDto,
} from './dto/region.dto';
import { StoreQueryDto } from './dto/store-query.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreService } from './store.service';

@ApiTags('Store Network & Regions')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('stores')
  @UseGuards(JwtAuthGuard, DataScopeGuard)
  @ApiOperation({
    summary: 'List stores scoped to the authenticated user role (@DataScope)',
    description:
      'Store Managers see only their assigned stores, Regional Managers see stores in their assigned regions, and Executives/Admins see all stores.',
  })
  @SwaggerResponse({ status: 200, description: 'Scoped list of stores.' })
  async findAllStores(
    @Query() query: StoreQueryDto,
    @DataScope('store') dataScope: StoreScopedFilter,
  ) {
    return this.storeService.findAll(query, dataScope);
  }

  @Get('stores/network-directory')
  @ApiOperation({
    summary:
      'Lightweight peer store network directory without financial/inventory metrics',
    description:
      'Allows store staff to view basic contact details and locations of peer stores across the network for inter-store stock transfer coordination.',
  })
  @ApiQuery({
    name: 'regionId',
    required: false,
    description: 'Optional Region UUID filter',
  })
  @SwaggerResponse({
    status: 200,
    type: [StoreNetworkDirectoryItemDto],
    description: 'Peer store contact directory.',
  })
  async getNetworkDirectory(
    @Query('regionId') regionId?: string,
  ): Promise<StoreNetworkDirectoryItemDto[]> {
    return this.storeService.getNetworkDirectory(regionId);
  }

  @Get('stores/types')
  @ApiOperation({
    summary: 'List store format types (HYPERMARKET, SUPERMARKET, EXPRESS)',
  })
  @SwaggerResponse({ status: 200, description: 'Store format types.' })
  async getStoreTypes() {
    return this.storeService.getStoreTypes();
  }

  @Get('stores/:id')
  @ApiOperation({
    summary: 'Get full store profile by ID',
  })
  @SwaggerResponse({ status: 200, description: 'Store profile details.' })
  @SwaggerResponse({ status: 404, description: 'Store not found.' })
  async findStoreById(@Param('id', ParseUUIDPipe) id: string) {
    return this.storeService.findById(id);
  }

  @Post('stores')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Create a new retail store location (ADMIN only)',
  })
  @SwaggerResponse({ status: 201, description: 'Store created.' })
  @SwaggerResponse({
    status: 409,
    description: 'Duplicate storeCode (STORE_CODE_EXISTS).',
  })
  async createStore(@Body() dto: CreateStoreDto) {
    return this.storeService.create(dto);
  }

  @Put('stores/:id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Update store details or dynamic geolocation coordinates (ADMIN only)',
  })
  @SwaggerResponse({ status: 200, description: 'Store updated.' })
  async updateStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storeService.update(id, dto);
  }

  @Delete('stores/:id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Soft-delete a store by setting isActive = false (ADMIN only)',
  })
  @SwaggerResponse({ status: 200, description: 'Store soft-deleted.' })
  async deleteStore(@Param('id', ParseUUIDPipe) id: string) {
    return this.storeService.softDelete(id);
  }

  @Get('regions')
  @ApiOperation({
    summary: 'List all active operational regions',
  })
  @SwaggerResponse({ status: 200, description: 'Active operational regions.' })
  async getRegions() {
    return this.storeService.getRegions();
  }

  @Post('regions')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Create a new operational region (ADMIN only)',
  })
  @SwaggerResponse({ status: 201, description: 'Region created.' })
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.storeService.createRegion(dto);
  }
}
