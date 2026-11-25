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
import { RoleType, TransferStatus } from '@prisma/client';
import {
  CurrentUser,
  DataScope,
  DataScopeGuard,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  StoreScopedFilter,
} from '@/core';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { DispatchTransferDto } from './dto/dispatch-transfer.dto';
import {
  CancelTransferDto,
  ReceiveTransferDto,
} from './dto/receive-transfer.dto';
import { TransferService } from './transfer.service';

@ApiTags('Inter-Store Stock Transfers')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get()
  @UseGuards(JwtAuthGuard, DataScopeGuard)
  @ApiOperation({
    summary:
      'List inter-store stock transfers scoped to user assigned stores or regions',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TransferStatus,
  })
  @SwaggerResponse({ status: 200, description: 'Scoped stock transfer list.' })
  async findAll(
    @DataScope('transfer') dataScope: StoreScopedFilter,
    @Query('status') status?: TransferStatus,
  ) {
    return this.transferService.findAll(dataScope, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get inter-store stock transfer details and line items by ID',
  })
  @SwaggerResponse({ status: 200, description: 'StockTransfer details.' })
  @SwaggerResponse({ status: 404, description: 'Transfer not found.' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.transferService.findById(id);
  }

  @Post()
  @Roles(
    RoleType.STORE_MANAGER,
    RoleType.REGIONAL_MANAGER,
    RoleType.ADMIN,
  )
  @ApiOperation({
    summary:
      'Create a new inter-store stock transfer request in PENDING_APPROVAL state',
  })
  @SwaggerResponse({ status: 201, description: 'StockTransfer created.' })
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transferService.createTransfer(dto, userId);
  }

  @Post(':id/dispatch')
  @Roles(RoleType.STORE_MANAGER, RoleType.ADMIN)
  @ApiOperation({
    summary:
      'Dispatch a PENDING_APPROVAL transfer: moves stock from availableQuantity to inTransitQuantity',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Transfer transitioned to APPROVED_IN_TRANSIT.',
  })
  async dispatchTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DispatchTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transferService.dispatchTransfer(id, dto, userId);
  }

  @Post(':id/receive')
  @Roles(RoleType.STORE_MANAGER, RoleType.ADMIN)
  @ApiOperation({
    summary:
      'Receive an APPROVED_IN_TRANSIT transfer: credits destination availableQuantity and writes off shortfalls as DAMAGED_WRITE_OFF',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Transfer transitioned to RECEIVED.',
  })
  async receiveTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transferService.receiveTransfer(id, dto, userId);
  }

  @Post(':id/cancel')
  @Roles(
    RoleType.STORE_MANAGER,
    RoleType.REGIONAL_MANAGER,
    RoleType.ADMIN,
  )
  @ApiOperation({
    summary:
      'Cancel a PENDING_APPROVAL or APPROVED_IN_TRANSIT transfer (reversing in-transit balances if already dispatched)',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Transfer transitioned to CANCELLED.',
  })
  async cancelTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transferService.cancelTransfer(id, userId, dto.reason);
  }
}
