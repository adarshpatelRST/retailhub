import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PriorityLevel, Prisma, RecStatus, RecType } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { PaginatedResponse } from '@/core/common/api-response.dto';
import { StoreScopedFilter } from '@/core/security/data-scope.decorator';
import { VelocityService } from '@/modules/sales/velocity.service';
import { EvaluationResultDto } from '../dto/evaluation-result.dto';
import { CandidateStoreDto } from '../dto/candidate-store.dto';
import {
  AnomalyQueryDto,
  StockAnomalyItemDto,
} from '../dto/anomaly-query.dto';
import { DoiService } from './doi.service';
import { CandidateRankingService } from './candidate-ranking.service';

@Injectable()
export class RebalanceService {
  private readonly logger = new Logger(RebalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly velocityService: VelocityService,
    private readonly doiService: DoiService,
    private readonly candidateRankingService: CandidateRankingService,
  ) {}

  private generateRecommendationNumber(): string {
    const suffix = Date.now().toString().slice(-6);
    const entropy = Math.floor(10 + Math.random() * 90);
    return `REC-${suffix}${entropy}`;
  }

  /**
   * Core evaluation logic for a single inventory balance row inside a destination store.
   * Handles:
   * 1. Auto-expiration (`AUTO_EXPIRED`) when stock recovers to `'HEALTHY'`.
   * 2. High-risk (`DOI <= 3.0`) 14-day horizon calculation (`Math.ceil((14.0 * ads) - availableStock)`).
   * 3. Regional candidate matching (`STOCK_TRANSFER`) or Central Supply fallback (`REORDER`).
   * 4. Deduplication against existing `'OPEN'` / `'MODIFIED'` recommendations.
   */
  private async evaluateInventoryItem(
    store: { id: string; storeCode: string; regionId: string },
    inventory: {
      id: string;
      productId: string;
      availableQuantity: Prisma.Decimal;
      reorderLevel: Prisma.Decimal;
      maximumStock: Prisma.Decimal;
    },
    ads: number,
  ): Promise<{
    highRiskDetected: number;
    newRecommendationsCreated: number;
    existingRecommendationsRefreshed: number;
    autoExpiredCount: number;
  }> {
    let highRiskDetected = 0;
    let newRecommendationsCreated = 0;
    let existingRecommendationsRefreshed = 0;
    let autoExpiredCount = 0;

    const availableStock = Number(inventory.availableQuantity);
    const reorderLevel = Number(inventory.reorderLevel);
    const maximumStock = Number(inventory.maximumStock);

    const doi = this.doiService.calculateDOI(availableStock, ads);
    const risk = this.doiService.classifyRisk(doi);
    const status = this.doiService.classifyStatus(
      availableStock,
      reorderLevel,
      maximumStock,
      doi,
    );

    // 1. Auto-Expiration Check when destination store stock recovers to HEALTHY
    if (status === 'HEALTHY') {
      const existingOpenRecs = await this.prisma.recommendation.findMany({
        where: {
          storeId: store.id,
          productId: inventory.productId,
          status: { in: [RecStatus.OPEN, RecStatus.MODIFIED] },
        },
        select: { id: true },
      });

      if (existingOpenRecs.length > 0) {
        await this.prisma.recommendation.updateMany({
          where: {
            id: { in: existingOpenRecs.map((r) => r.id) },
          },
          data: {
            status: RecStatus.AUTO_EXPIRED,
            reason:
              'Auto-closed: Destination store stock normalized to healthy buffer via inward receipt.',
          },
        });
        autoExpiredCount += existingOpenRecs.length;
      }

      return {
        highRiskDetected,
        newRecommendationsCreated,
        existingRecommendationsRefreshed,
        autoExpiredCount,
      };
    }

    // 2. Stock-Out Rebalance Trigger when Risk == 'HIGH' (DOI <= 3.0)
    if (risk === 'HIGH') {
      highRiskDetected += 1;

      const rawTarget = Math.ceil(14.0 * ads - availableStock);
      const targetUnitsNeeded = rawTarget > 0 ? rawTarget : 10;

      const candidates =
        await this.candidateRankingService.findAndRankCandidates(
          store.id,
          store.regionId,
          inventory.productId,
          targetUnitsNeeded,
        );

      let recType: RecType;
      let fromStoreId: string | null;
      let recommendedQtyNumber: number;
      let reason: string;
      let evidenceRows: Array<{
        metric: string;
        value: string;
        description: string;
      }>;

      if (candidates.length > 0) {
        const rank1 = candidates[0];
        fromStoreId = rank1.storeId;
        recommendedQtyNumber = Math.min(
          targetUnitsNeeded,
          rank1.maxSafeTransferQty,
        );
        recType = RecType.STOCK_TRANSFER;
        reason = `High stock-out risk (DOI ${doi.toFixed(2)}d <= 3.0d). Regional transfer from ${rank1.storeCode} (${rank1.distanceKm.toFixed(1)} km) recommended.`;

        evidenceRows = [
          {
            metric: 'DEST_DOI',
            value: doi.toFixed(2),
            description: 'Destination store current Days of Inventory (DOI)',
          },
          {
            metric: 'DEST_STOCK',
            value: availableStock.toFixed(3),
            description: 'Destination store current available stock',
          },
          {
            metric: 'SRC_DOI',
            value: rank1.currentDOI.toFixed(2),
            description: `Donor store (${rank1.storeCode}) pre-transfer DOI`,
          },
          {
            metric: 'SRC_STOCK',
            value: rank1.availableStock.toFixed(3),
            description: `Donor store (${rank1.storeCode}) available stock`,
          },
          {
            metric: 'SRC_POST_TRANSFER_DOI',
            value: rank1.postTransferDOI.toFixed(2),
            description: `Donor store (${rank1.storeCode}) projected DOI after transfer (> 7.0d safety floor)`,
          },
          {
            metric: 'DISTANCE_KM',
            value: rank1.distanceKm.toFixed(2),
            description: 'Haversine proximity between donor and destination stores',
          },
        ];
      } else {
        fromStoreId = null;
        recommendedQtyNumber = targetUnitsNeeded;
        recType = RecType.REORDER;
        reason =
          'No regional store holds surplus inventory. Central Supply reorder required.';

        evidenceRows = [
          {
            metric: 'DEST_DOI',
            value: doi.toFixed(2),
            description: 'Destination store current Days of Inventory (DOI)',
          },
          {
            metric: 'DEST_STOCK',
            value: availableStock.toFixed(3),
            description: 'Destination store current available stock',
          },
          {
            metric: 'REASON',
            value: 'CENTRAL_SUPPLY_FALLBACK',
            description:
              'No regional store holds surplus inventory. Central Supply reorder required.',
          },
        ];
      }

      const recommendedDecimal = new Prisma.Decimal(
        recommendedQtyNumber.toFixed(3),
      );

      // 3. Deduplication Check
      const existingActiveRec = await this.prisma.recommendation.findFirst({
        where: {
          storeId: store.id,
          productId: inventory.productId,
          status: { in: [RecStatus.OPEN, RecStatus.MODIFIED] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingActiveRec) {
        await this.prisma.$transaction([
          this.prisma.recommendationEvidence.deleteMany({
            where: { recommendationId: existingActiveRec.id },
          }),
          this.prisma.recommendation.update({
            where: { id: existingActiveRec.id },
            data: {
              recommendationType: recType,
              fromStoreId,
              toStoreId: store.id,
              recommendedQuantity: recommendedDecimal,
              priority: PriorityLevel.HIGH,
              reason,
              updatedAt: new Date(),
              evidence: {
                create: evidenceRows,
              },
            },
          }),
        ]);
        existingRecommendationsRefreshed += 1;
      } else {
        await this.prisma.recommendation.create({
          data: {
            recommendationNumber: this.generateRecommendationNumber(),
            recommendationType: recType,
            storeId: store.id,
            productId: inventory.productId,
            fromStoreId,
            toStoreId: store.id,
            recommendedQuantity: recommendedDecimal,
            priority: PriorityLevel.HIGH,
            reason,
            status: RecStatus.OPEN,
            isManualRequest: false,
            evidence: {
              create: evidenceRows,
            },
          },
        });
        newRecommendationsCreated += 1;
      }
    }

    return {
      highRiskDetected,
      newRecommendationsCreated,
      existingRecommendationsRefreshed,
      autoExpiredCount,
    };
  }

  /**
   * Store-level scan: Evaluates all inventory SKUs in a single store.
   */
  async evaluateStore(storeId: string): Promise<EvaluationResultDto> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        storeCode: true,
        regionId: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive) {
      throw new NotFoundException({
        code: 'STORE_NOT_FOUND',
        message: `Active store '${storeId}' does not exist.`,
      });
    }

    const inventories = await this.prisma.inventory.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        productId: true,
        availableQuantity: true,
        reorderLevel: true,
        maximumStock: true,
      },
    });

    const velocityMap = await this.velocityService.getStoreVelocityMap(
      store.id,
      30,
    );

    let highRiskDetected = 0;
    let newRecommendationsCreated = 0;
    let existingRecommendationsRefreshed = 0;
    let autoExpiredCount = 0;

    for (const inv of inventories) {
      const ads = velocityMap[inv.productId] ?? 0.0;
      const itemMetrics = await this.evaluateInventoryItem(store, inv, ads);

      highRiskDetected += itemMetrics.highRiskDetected;
      newRecommendationsCreated += itemMetrics.newRecommendationsCreated;
      existingRecommendationsRefreshed +=
        itemMetrics.existingRecommendationsRefreshed;
      autoExpiredCount += itemMetrics.autoExpiredCount;
    }

    return {
      evaluatedStores: 1,
      evaluatedSKUs: inventories.length,
      highRiskDetected,
      newRecommendationsCreated,
      existingRecommendationsRefreshed,
      autoExpiredCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Region-level scan: Iterates over all active stores in a region and aggregates results.
   */
  async evaluateRegion(regionId: string): Promise<EvaluationResultDto> {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });

    if (!region) {
      throw new NotFoundException({
        code: 'REGION_NOT_FOUND',
        message: `Region '${regionId}' does not exist.`,
      });
    }

    const stores = await this.prisma.store.findMany({
      where: { regionId, isActive: true },
      select: { id: true },
    });

    const totals: EvaluationResultDto = {
      evaluatedStores: 0,
      evaluatedSKUs: 0,
      highRiskDetected: 0,
      newRecommendationsCreated: 0,
      existingRecommendationsRefreshed: 0,
      autoExpiredCount: 0,
      timestamp: new Date().toISOString(),
    };

    for (const store of stores) {
      const res = await this.evaluateStore(store.id);
      totals.evaluatedStores += res.evaluatedStores;
      totals.evaluatedSKUs += res.evaluatedSKUs;
      totals.highRiskDetected += res.highRiskDetected;
      totals.newRecommendationsCreated += res.newRecommendationsCreated;
      totals.existingRecommendationsRefreshed +=
        res.existingRecommendationsRefreshed;
      totals.autoExpiredCount += res.autoExpiredCount;
    }

    totals.timestamp = new Date().toISOString();
    return totals;
  }

  /**
   * Enterprise-level scan: Iterates over all active stores across all regions.
   */
  async evaluateEnterprise(): Promise<EvaluationResultDto> {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const totals: EvaluationResultDto = {
      evaluatedStores: 0,
      evaluatedSKUs: 0,
      highRiskDetected: 0,
      newRecommendationsCreated: 0,
      existingRecommendationsRefreshed: 0,
      autoExpiredCount: 0,
      timestamp: new Date().toISOString(),
    };

    for (const store of stores) {
      const res = await this.evaluateStore(store.id);
      totals.evaluatedStores += res.evaluatedStores;
      totals.evaluatedSKUs += res.evaluatedSKUs;
      totals.highRiskDetected += res.highRiskDetected;
      totals.newRecommendationsCreated += res.newRecommendationsCreated;
      totals.existingRecommendationsRefreshed +=
        res.existingRecommendationsRefreshed;
      totals.autoExpiredCount += res.autoExpiredCount;
    }

    totals.timestamp = new Date().toISOString();
    return totals;
  }

  /**
   * Scheduled Morning Rebalance Cron Job — executes every morning at 06:00 AM.
   */
  @Cron('0 6 * * *')
  async handleMorningRebalance(): Promise<EvaluationResultDto> {
    this.logger.log(
      'Starting scheduled 06:00 AM enterprise inventory rebalance evaluation...',
    );
    return this.evaluateEnterprise();
  }

  /**
   * Lightweight single-SKU evaluation method for asynchronous event trigger
   * when POS sales breach reorder thresholds.
   */
  async evaluateSingleSku(
    storeId: string,
    productId: string,
  ): Promise<EvaluationResultDto> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        storeCode: true,
        regionId: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive) {
      throw new NotFoundException({
        code: 'STORE_NOT_FOUND',
        message: `Active store '${storeId}' does not exist.`,
      });
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId,
          productId,
        },
      },
      select: {
        id: true,
        productId: true,
        availableQuantity: true,
        reorderLevel: true,
        maximumStock: true,
      },
    });

    if (!inventory) {
      return {
        evaluatedStores: 1,
        evaluatedSKUs: 0,
        highRiskDetected: 0,
        newRecommendationsCreated: 0,
        existingRecommendationsRefreshed: 0,
        autoExpiredCount: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const ads = await this.velocityService.getAverageDailySales(
      storeId,
      productId,
      30,
    );

    const metrics = await this.evaluateInventoryItem(store, inventory, ads);

    return {
      evaluatedStores: 1,
      evaluatedSKUs: 1,
      highRiskDetected: metrics.highRiskDetected,
      newRecommendationsCreated: metrics.newRecommendationsCreated,
      existingRecommendationsRefreshed:
        metrics.existingRecommendationsRefreshed,
      autoExpiredCount: metrics.autoExpiredCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Lists stock anomalies (high-risk stock-outs, low buffers, or trapped excess inventory)
   * scoped to the authenticated user's stores/regions.
   */
  async findAnomalies(
    query: AnomalyQueryDto,
    dataScope?: StoreScopedFilter,
  ): Promise<PaginatedResponse<StockAnomalyItemDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const andConditions: Prisma.InventoryWhereInput[] = [];

    if (dataScope?.storeId?.in) {
      andConditions.push({ storeId: { in: dataScope.storeId.in } });
    } else if (dataScope?.store?.regionId?.in) {
      andConditions.push({
        store: { regionId: { in: dataScope.store.regionId.in } },
      });
    }

    if (query.storeId) {
      andConditions.push({ storeId: query.storeId });
    }

    if (query.regionId) {
      andConditions.push({ store: { regionId: query.regionId } });
    }

    const inventories = await this.prisma.inventory.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : {},
      include: {
        store: {
          include: {
            region: true,
          },
        },
        product: true,
      },
      orderBy: { availableQuantity: 'asc' },
    });

    const velocityCache = new Map<string, Record<string, number>>();
    const anomalies: StockAnomalyItemDto[] = [];

    for (const inv of inventories) {
      if (!velocityCache.has(inv.storeId)) {
        const map = await this.velocityService.getStoreVelocityMap(
          inv.storeId,
          30,
        );
        velocityCache.set(inv.storeId, map);
      }

      const storeVelocities = velocityCache.get(inv.storeId)!;
      const ads = storeVelocities[inv.productId] ?? 0.0;
      const availableStock = Number(inv.availableQuantity);
      const reorderLevel = Number(inv.reorderLevel);
      const maximumStock = Number(inv.maximumStock);

      const doi = this.doiService.calculateDOI(availableStock, ads);
      const risk = this.doiService.classifyRisk(doi);
      const status = this.doiService.classifyStatus(
        availableStock,
        reorderLevel,
        maximumStock,
        doi,
      );

      // Include only anomalous items (CRITICAL, LOW, EXCESS, or HIGH/MEDIUM DOI risk)
      if (status === 'HEALTHY' && risk === 'LOW') {
        continue;
      }

      if (query.priority && risk !== query.priority) {
        continue;
      }

      if (query.status && status !== query.status) {
        continue;
      }

      anomalies.push({
        inventoryId: inv.id,
        storeId: inv.storeId,
        storeCode: inv.store.storeCode,
        storeName: inv.store.name,
        regionId: inv.store.regionId,
        regionCode: inv.store.region.code,
        productId: inv.productId,
        sku: inv.product.sku,
        productName: inv.product.name,
        availableStock: Number(availableStock.toFixed(3)),
        reorderLevel: Number(reorderLevel.toFixed(3)),
        maximumStock: Number(maximumStock.toFixed(3)),
        ads: Number(ads.toFixed(3)),
        doi,
        risk,
        status,
      });
    }

    const total = anomalies.length;
    const pagedItems = anomalies.slice((page - 1) * limit, page * limit);
    return PaginatedResponse.create(pagedItems, total, page, limit);
  }

  /**
   * Returns ranked regional donor store candidates for a specific Recommendation ID.
   */
  async getCandidatesForRecommendation(
    recommendationId: string,
  ): Promise<CandidateStoreDto[]> {
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        store: {
          select: {
            id: true,
            regionId: true,
          },
        },
      },
    });

    if (!recommendation) {
      throw new NotFoundException({
        code: 'REC_NOT_FOUND',
        message: `Recommendation '${recommendationId}' does not exist.`,
      });
    }

    const targetUnits = Math.max(
      1,
      Math.ceil(Number(recommendation.recommendedQuantity)),
    );

    return this.candidateRankingService.findAndRankCandidates(
      recommendation.storeId,
      recommendation.store.regionId,
      recommendation.productId,
      targetUnits,
    );
  }
}
