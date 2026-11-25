import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActionType,
  MovementType,
  Prisma,
  RecPriority,
  RecStatus,
  RecType,
  TransferStatus,
} from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { AuthenticatedUser } from '@/core/security/current-user.decorator';
import { CandidateRankingService, DoiService, RebalanceService } from '@/modules/intelligence';
import { VelocityService } from '@/modules/sales/velocity.service';
import { AiService } from '@/modules/ai/ai.service';
import { ApproveRecommendationDto } from './dto/approve-recommendation.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';
import { ModifyRecommendationDto } from './dto/modify-recommendation.dto';
import { RejectRecommendationDto } from './dto/reject-recommendation.dto';
import { CreateStoreRequestDto } from './dto/store-request.dto';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

@Injectable()
export class ActionCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateRankingService: CandidateRankingService,
    private readonly doiService: DoiService,
    private readonly velocityService: VelocityService,
    private readonly rebalanceService: RebalanceService,
    private readonly aiService: AiService,
  ) {}

  private resolveActorUserId(user: AuthenticatedUser): string {
    return user.userId ?? user.id;
  }

  /**
   * Lists recommendations filtered by server-side DataScope, status, priority, and store/region.
   */
  async findAll(query: RecommendationQueryDto, dataScope: Record<string, any>) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RecommendationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.recommendationType ? { recommendationType: query.recommendationType } : {}),
    };

    // Apply server-side DataScope or explicit query filters
    if (query.storeId) {
      where.OR = [{ toStoreId: query.storeId }, { fromStoreId: query.storeId }];
    } else if (dataScope?.storeId) {
      where.OR = [{ toStoreId: dataScope.storeId }, { fromStoreId: dataScope.storeId }];
    } else if (query.regionId) {
      where.toStore = { regionId: query.regionId };
    } else if (dataScope?.store?.regionId) {
      where.toStore = { regionId: dataScope.store.regionId };
    }

    const [items, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { generatedAt: 'desc' }],
        include: {
          product: { select: { id: true, sku: true, barcode: true, name: true, unitPrice: true } },
          fromStore: { select: { id: true, storeCode: true, name: true, city: true } },
          toStore: { select: { id: true, storeCode: true, name: true, city: true, regionId: true } },
          evidences: true,
          actions: {
            orderBy: { actionedOn: 'desc' },
            take: 5,
            include: {
              user: { select: { id: true, fullName: true, email: true } },
              history: { orderBy: { changedOn: 'desc' } },
            },
          },
        },
      }),
      this.prisma.recommendation.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns full recommendation detail including ranked candidate donor stores,
   * DOI comparison evidence, and action history.
   */
  async findOne(id: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id },
      include: {
        product: true,
        fromStore: true,
        toStore: { include: { region: true } },
        evidences: true,
        actions: {
          orderBy: { actionedOn: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            history: { orderBy: { changedOn: 'desc' } },
          },
        },
      },
    });

    if (!rec) {
      throw new NotFoundException(`Recommendation ${id} not found`);
    }

    return rec;
  }

  /**
   * Approves a single recommendation inside a Prisma transaction:
   * - If `fromStoreId != null`: creates StockTransfer (APPROVED_IN_TRANSIT), decrements donor availableQuantity,
   *   increments inTransitQuantity, and logs StockMovement.
   * - If `fromStoreId == null` (Central Supply fallback): directly increments destination availableQuantity
   *   and logs INWARD_RECEIPT movement.
   * - Transitions Recommendation status to COMPLETED and logs Action + ActionHistory.
   */
  async approve(id: string, dto: ApproveRecommendationDto, user: AuthenticatedUser) {
    const actorUserId = this.resolveActorUserId(user);

    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.recommendation.findUnique({
        where: { id },
      });

      if (!rec) {
        throw new NotFoundException(`Recommendation ${id} not found`);
      }

      if (rec.status !== RecStatus.OPEN && rec.status !== RecStatus.MODIFIED) {
        throw new ConflictException(
          `Recommendation ${id} cannot be approved because its status is ${rec.status}`,
        );
      }

      const qty = Number(rec.recommendedQuantity);
      const previousStatus = rec.status;
      let createdTransferId: string | null = null;

      if (rec.fromStoreId) {
        // Regional Store-to-Store Transfer
        const sourceInv = await tx.inventoryBalance.findUnique({
          where: {
            storeId_productId: {
              storeId: rec.fromStoreId,
              productId: rec.productId,
            },
          },
        });

        if (!sourceInv || Number(sourceInv.availableQuantity) < qty) {
          throw new BadRequestException(
            `Source store has insufficient available stock (${sourceInv?.availableQuantity ?? 0}) for transfer quantity ${qty}`,
          );
        }

        const balanceBefore = Number(sourceInv.availableQuantity);
        const balanceAfter = balanceBefore - qty;

        await tx.inventoryBalance.update({
          where: { id: sourceInv.id },
          data: {
            availableQuantity: balanceAfter,
            inTransitQuantity: { increment: qty },
            version: { increment: 1 },
            lastUpdated: new Date(),
          },
        });

        const transferNumber = `TRF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const transfer = await tx.stockTransfer.create({
          data: {
            transferNumber,
            fromStoreId: rec.fromStoreId,
            toStoreId: rec.toStoreId,
            status: TransferStatus.APPROVED_IN_TRANSIT,
            initiatedBy: actorUserId,
            approvedBy: actorUserId,
            approvedAt: new Date(),
            items: {
              create: {
                productId: rec.productId,
                requestedQuantity: qty,
                dispatchedQuantity: qty,
              },
            },
          },
        });

        createdTransferId = transfer.id;

        await tx.stockMovement.create({
          data: {
            storeId: rec.fromStoreId,
            productId: rec.productId,
            movementType: MovementType.TRANSFER_OUT_DISPATCH,
            quantityChange: -qty,
            balanceBefore,
            balanceAfter,
            referenceId: transfer.id,
            referenceType: 'RECOMMENDATION_APPROVAL',
            performedBy: actorUserId,
            notes: dto.comments ?? `Approved from Recommendation ${rec.id}`,
          },
        });
      } else {
        // Central Supply / Warehouse Replenishment Fallback
        const destInv = await tx.inventoryBalance.findUnique({
          where: {
            storeId_productId: {
              storeId: rec.toStoreId,
              productId: rec.productId,
            },
          },
        });

        const balanceBefore = destInv ? Number(destInv.availableQuantity) : 0;
        const balanceAfter = balanceBefore + qty;

        if (destInv) {
          await tx.inventoryBalance.update({
            where: { id: destInv.id },
            data: {
              availableQuantity: balanceAfter,
              version: { increment: 1 },
              lastRestockedAt: new Date(),
              lastUpdated: new Date(),
            },
          });
        } else {
          await tx.inventoryBalance.create({
            data: {
              storeId: rec.toStoreId,
              productId: rec.productId,
              availableQuantity: qty,
              reservedQuantity: 0,
              inTransitQuantity: 0,
              minimumStock: 10,
              reorderPoint: 15,
              lastRestockedAt: new Date(),
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            storeId: rec.toStoreId,
            productId: rec.productId,
            movementType: MovementType.INWARD_RECEIPT,
            quantityChange: qty,
            balanceBefore,
            balanceAfter,
            referenceId: rec.id,
            referenceType: 'CENTRAL_SUPPLY',
            performedBy: actorUserId,
            notes: dto.comments ?? `Central Supply replenishment approved for Recommendation ${rec.id}`,
          },
        });
      }

      const updatedRec = await tx.recommendation.update({
        where: { id: rec.id },
        data: { status: RecStatus.COMPLETED },
      });

      const action = await tx.action.create({
        data: {
          recommendationId: rec.id,
          actionType: ActionType.APPROVE,
          actionedBy: actorUserId,
          comments: dto.comments ?? 'Recommendation approved',
        },
      });

      await tx.actionHistory.create({
        data: {
          actionId: action.id,
          previousStatus,
          newStatus: RecStatus.COMPLETED,
          changedBy: actorUserId,
          comments: dto.comments ?? 'Transitioned to COMPLETED on approval',
        },
      });

      return {
        recommendation: updatedRec,
        transferId: createdTransferId,
        actionId: action.id,
      };
    });
  }

  /**
   * Batch approves multiple recommendations sequentially, collecting successes and failures.
   */
  async batchApprove(dto: BatchApproveDto, user: AuthenticatedUser) {
    const succeeded: string[] = [];
    const failures: Array<{ id: string; reason: string }> = [];

    for (const id of dto.recommendationIds) {
      try {
        await this.approve(id, { comments: dto.comments ?? 'Batch approved' }, user);
        succeeded.push(id);
      } catch (error) {
        failures.push({
          id,
          reason: (error as Error).message,
        });
      }
    }

    return {
      processedCount: dto.recommendationIds.length,
      succeededCount: succeeded.length,
      failedCount: failures.length,
      succeededIds: succeeded,
      failures,
    };
  }

  /**
   * Modifies a recommendation's donor store and/or transfer quantity:
   * - Validates that comments are provided.
   * - Validates that the new donor store's Post-Transfer DOI stays strictly > 7.0 days.
   * - Transitions status to MODIFIED and logs Action + ActionHistory.
   */
  async modify(id: string, dto: ModifyRecommendationDto, user: AuthenticatedUser) {
    const actorUserId = this.resolveActorUserId(user);

    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.recommendation.findUnique({
        where: { id },
      });

      if (!rec) {
        throw new NotFoundException(`Recommendation ${id} not found`);
      }

      if (rec.status !== RecStatus.OPEN && rec.status !== RecStatus.MODIFIED) {
        throw new ConflictException(
          `Recommendation ${id} cannot be modified in status ${rec.status}`,
        );
      }

      const targetFromStoreId = dto.sourceStoreId ?? rec.fromStoreId;

      if (targetFromStoreId) {
        const donorInv = await tx.inventoryBalance.findUnique({
          where: {
            storeId_productId: {
              storeId: targetFromStoreId,
              productId: rec.productId,
            },
          },
        });

        if (!donorInv) {
          throw new BadRequestException('Selected donor store has no inventory record for this product');
        }

        const donorStock = Number(donorInv.availableQuantity);
        if (dto.modifiedQuantity > donorStock) {
          throw new BadRequestException(
            `Modified quantity (${dto.modifiedQuantity}) exceeds donor store available stock (${donorStock})`,
          );
        }

        const donorAds = await this.velocityService.getAverageDailySales(
          targetFromStoreId,
          rec.productId,
        );
        const postTransferStock = donorStock - dto.modifiedQuantity;
        const postTransferDOI = this.doiService.calculateDOI(postTransferStock, donorAds);

        if (postTransferDOI <= 7.0) {
          throw new BadRequestException(
            `7-Day Source DOI Protection Violated: Modifying quantity to ${dto.modifiedQuantity} drops donor store post-transfer DOI to ${postTransferDOI.toFixed(1)} days (minimum > 7.0 days required).`,
          );
        }
      }

      const previousStatus = rec.status;

      const updatedRec = await tx.recommendation.update({
        where: { id: rec.id },
        data: {
          fromStoreId: targetFromStoreId,
          recommendedQuantity: dto.modifiedQuantity,
          status: RecStatus.MODIFIED,
          aiExplanation: null, // Invalidate cached narrative so AI reflects modified numbers
        },
      });

      const action = await tx.action.create({
        data: {
          recommendationId: rec.id,
          actionType: ActionType.MODIFY,
          actionedBy: actorUserId,
          comments: dto.comments,
        },
      });

      await tx.actionHistory.create({
        data: {
          actionId: action.id,
          previousStatus,
          newStatus: RecStatus.MODIFIED,
          changedBy: actorUserId,
          comments: dto.comments,
        },
      });

      return updatedRec;
    });
  }

  /**
   * Rejects a recommendation with a mandatory reason. No stock movement is created.
   */
  async reject(id: string, dto: RejectRecommendationDto, user: AuthenticatedUser) {
    const actorUserId = this.resolveActorUserId(user);

    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.recommendation.findUnique({
        where: { id },
      });

      if (!rec) {
        throw new NotFoundException(`Recommendation ${id} not found`);
      }

      if (rec.status !== RecStatus.OPEN && rec.status !== RecStatus.MODIFIED) {
        throw new ConflictException(
          `Recommendation ${id} cannot be rejected in status ${rec.status}`,
        );
      }

      const previousStatus = rec.status;

      const updatedRec = await tx.recommendation.update({
        where: { id: rec.id },
        data: { status: RecStatus.REJECTED },
      });

      const action = await tx.action.create({
        data: {
          recommendationId: rec.id,
          actionType: ActionType.REJECT,
          actionedBy: actorUserId,
          comments: dto.reason,
        },
      });

      await tx.actionHistory.create({
        data: {
          actionId: action.id,
          previousStatus,
          newStatus: RecStatus.REJECTED,
          changedBy: actorUserId,
          comments: dto.reason,
        },
      });

      return updatedRec;
    });
  }

  /**
   * Creates an ad-hoc manual store request (`isManualRequest = true`, `recommendationType = 'MANUAL_STORE_REQUEST'`)
   * and immediately invokes `CandidateRankingService` to suggest the best regional donor store.
   */
  async createStoreRequest(dto: CreateStoreRequestDto, user: AuthenticatedUser) {
    const actorUserId = this.resolveActorUserId(user);

    const destStore = await this.prisma.store.findUnique({
      where: { id: dto.toStoreId },
    });

    if (!destStore) {
      throw new NotFoundException(`Destination store ${dto.toStoreId} not found`);
    }

    const candidates = await this.candidateRankingService.findAndRankCandidates(
      destStore.id,
      destStore.regionId,
      dto.productId,
      dto.requestedQuantity,
    );

    const bestCandidate = candidates.length > 0 ? candidates[0] : null;
    const destAds = await this.velocityService.getAverageDailySales(destStore.id, dto.productId);
    const destInv = await this.prisma.inventoryBalance.findUnique({
      where: {
        storeId_productId: {
          storeId: destStore.id,
          productId: dto.productId,
        },
      },
    });

    const destStock = destInv ? Number(destInv.availableQuantity) : 0;
    const destCurrentDOI = this.doiService.calculateDOI(destStock, destAds);

    const created = await this.prisma.recommendation.create({
      data: {
        recommendationType: RecType.MANUAL_STORE_REQUEST,
        priority: dto.priority ?? RecPriority.HIGH,
        status: RecStatus.OPEN,
        isManualRequest: true,
        productId: dto.productId,
        fromStoreId: bestCandidate ? bestCandidate.storeId : null,
        toStoreId: destStore.id,
        recommendedQuantity: dto.requestedQuantity,
        evidences: {
          create: [
            {
              factorType: 'STOCK_VELOCITY_SNAPSHOT',
              description: `Manual store request initiated by ${user.email}: ${dto.reason}`,
              weightScore: 100,
              rawMetrics: {
                destAvailableStock: destStock,
                destADS: destAds,
                destCurrentDOI,
                targetDOI: 14,
                manualReason: dto.reason,
                requestedBy: actorUserId,
              },
            },
            {
              factorType: 'REGIONAL_CANDIDATE_RANKING',
              description: bestCandidate
                ? `Auto-ranked ${candidates.length} regional candidate donor store(s)`
                : 'No regional donor store available; routed to Central Supply fallback',
              weightScore: bestCandidate ? bestCandidate.suitabilityScore : 0,
              rawMetrics: {
                candidates: candidates as unknown as Prisma.InputJsonValue,
              },
            },
          ],
        },
      },
      include: {
        product: true,
        fromStore: true,
        toStore: true,
        evidences: true,
      },
    });

    return created;
  }

  /**
   * Delegates to AiService to retrieve or generate the executive narrative for a recommendation.
   */
  async getExplanation(id: string, forceRefresh = false) {
    return this.aiService.getOrGenerateExplanation(id, forceRefresh);
  }
}
