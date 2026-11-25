import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { Roles } from '@/core/security/roles.decorator';
import { DataScope } from '@/core/security/data-scope.decorator';
import { CurrentUser, AuthenticatedUser } from '@/core/security/current-user.decorator';
import { ActionCenterService } from './action-center.service';
import { ApproveRecommendationDto } from './dto/approve-recommendation.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';
import { ModifyRecommendationDto } from './dto/modify-recommendation.dto';
import { RejectRecommendationDto } from './dto/reject-recommendation.dto';
import { CreateStoreRequestDto } from './dto/store-request.dto';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

@Controller('recommendations')
export class ActionCenterController {
  constructor(private readonly actionCenterService: ActionCenterService) {}

  @Get()
  @Roles(
    RoleType.ADMIN,
    RoleType.EXECUTIVE,
    RoleType.REGIONAL_MANAGER,
    RoleType.STORE_MANAGER,
  )
  findAll(
    @Query() query: RecommendationQueryDto,
    @DataScope('recommendation') dataScope: Record<string, any>,
  ) {
    return this.actionCenterService.findAll(query, dataScope);
  }

  @Get(':id')
  @Roles(
    RoleType.ADMIN,
    RoleType.EXECUTIVE,
    RoleType.REGIONAL_MANAGER,
    RoleType.STORE_MANAGER,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.actionCenterService.findOne(id);
  }

  @Get(':id/explanation')
  @Roles(
    RoleType.ADMIN,
    RoleType.EXECUTIVE,
    RoleType.REGIONAL_MANAGER,
    RoleType.STORE_MANAGER,
  )
  getExplanation(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.actionCenterService.getExplanation(id, refresh === 'true');
  }

  @Post('batch-approve')
  @Roles(RoleType.ADMIN, RoleType.REGIONAL_MANAGER, RoleType.STORE_MANAGER)
  batchApprove(
    @Body() dto: BatchApproveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionCenterService.batchApprove(dto, user);
  }

  @Post('store-request')
  @Roles(RoleType.ADMIN, RoleType.REGIONAL_MANAGER, RoleType.STORE_MANAGER)
  createStoreRequest(
    @Body() dto: CreateStoreRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionCenterService.createStoreRequest(dto, user);
  }

  @Post(':id/approve')
  @Roles(RoleType.ADMIN, RoleType.REGIONAL_MANAGER, RoleType.STORE_MANAGER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRecommendationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionCenterService.approve(id, dto, user);
  }

  @Post(':id/modify')
  @Roles(RoleType.ADMIN, RoleType.REGIONAL_MANAGER, RoleType.STORE_MANAGER)
  modify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifyRecommendationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionCenterService.modify(id, dto, user);
  }

  @Post(':id/reject')
  @Roles(RoleType.ADMIN, RoleType.REGIONAL_MANAGER, RoleType.STORE_MANAGER)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRecommendationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionCenterService.reject(id, dto, user);
  }
}
