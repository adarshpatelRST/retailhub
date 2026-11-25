import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { VelocityService } from '@/modules/sales/velocity.service';
import { CandidateStoreDto } from '../dto/candidate-store.dto';
import { DoiService } from './doi.service';

interface RawCandidateMetrics {
  storeId: string;
  storeCode: string;
  storeName: string;
  availableStock: number;
  minimumStock: number;
  ads: number;
  currentDOI: number;
  postTransferDOI: number;
  maxSafeTransferQty: number;
  distanceKm: number;
  excessStockQty: number;
  excessDOI: number;
}

@Injectable()
export class CandidateRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly velocityService: VelocityService,
    private readonly doiService: DoiService,
  ) {}

  /**
   * Standard Haversine formula computing great-circle distance in kilometers
   * between two store coordinates. Returns `999.0` km if coordinates are missing.
   */
  calculateDistance(
    lat1?: number | null,
    lon1?: number | null,
    lat2?: number | null,
    lon2?: number | null,
  ): number {
    if (
      lat1 === null ||
      lat1 === undefined ||
      lon1 === null ||
      lon1 === undefined ||
      lat2 === null ||
      lat2 === undefined ||
      lon2 === null ||
      lon2 === undefined ||
      !Number.isFinite(lat1) ||
      !Number.isFinite(lon1) ||
      !Number.isFinite(lat2) ||
      !Number.isFinite(lon2)
    ) {
      return 999.0;
    }

    const earthRadiusKm = 6371.0;
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180.0;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;

    return Number(distance.toFixed(2));
  }

  /**
   * Discovers and ranks regional donor stores for `(destStoreId, regionId, productId)`:
   * 1. Restricts search strictly to active stores in the same `regionId` (`id != destStoreId`).
   * 2. Requires `availableStock > minimumStock` AND `currentDOI > 30.0` days.
   * 3. Enforces 7-Day Source DOI Protection floor:
   *    `maxSafeTransfer = Math.floor(availableStock - (7.0 * ads))`
   *    and verifies `postTransferDOI > 7.0` days.
   * 4. Normalizes excess stock quantity (60% weight) and excess DOI (40% weight).
   * 5. Sorts by `suitabilityScore DESC`, tie-breaking by `distanceKm ASC`, then `availableStock DESC`.
   */
  async findAndRankCandidates(
    destStoreId: string,
    regionId: string,
    productId: string,
    targetUnitsNeeded: number,
  ): Promise<CandidateStoreDto[]> {
    const destStore = await this.prisma.store.findUnique({
      where: { id: destStoreId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    const regionalPeerStores = await this.prisma.store.findMany({
      where: {
        regionId,
        id: { not: destStoreId },
        isActive: true,
      },
      include: {
        inventories: {
          where: { productId },
          take: 1,
        },
      },
    });

    const effectiveTarget =
      Number.isFinite(targetUnitsNeeded) && targetUnitsNeeded > 0
        ? Math.ceil(targetUnitsNeeded)
        : 10;

    const rawCandidates: RawCandidateMetrics[] = [];

    for (const store of regionalPeerStores) {
      const inv = store.inventories[0];
      if (!inv) {
        continue;
      }

      const availableStock = Number(inv.availableQuantity);
      const minimumStock = Number(inv.minimumStock);

      if (availableStock <= minimumStock) {
        continue;
      }

      const ads = await this.velocityService.getAverageDailySales(
        store.id,
        productId,
        30,
      );

      const currentDOI = this.doiService.calculateDOI(availableStock, ads);
      if (currentDOI <= 30.0) {
        continue;
      }

      // Enforce 7-Day Source DOI Protection Floor:
      // PostTransferDOI = (AvailableQuantity - TransferUnits) / ADS > 7.0 days
      let maxSafeTransfer = Math.floor(availableStock - 7.0 * ads);
      if (ads > 0 && (availableStock - maxSafeTransfer) / ads <= 7.0) {
        maxSafeTransfer = Math.max(0, maxSafeTransfer - 1);
      }

      // Also never breach donor store's minimumStock floor
      const maxAboveMinimum = Math.floor(availableStock - minimumStock);
      maxSafeTransfer = Math.min(maxSafeTransfer, maxAboveMinimum);

      if (maxSafeTransfer <= 0) {
        continue;
      }

      const transferUnits = Math.min(effectiveTarget, maxSafeTransfer);
      const postTransferDOI =
        ads > 0
          ? Number(((availableStock - transferUnits) / ads).toFixed(2))
          : 999.0;

      if (ads > 0 && postTransferDOI <= 7.0) {
        continue;
      }

      const distanceKm = this.calculateDistance(
        destStore?.latitude,
        destStore?.longitude,
        store.latitude,
        store.longitude,
      );

      const excessStockQty = Math.max(0, availableStock - minimumStock);
      const excessDOI = Math.max(0, currentDOI - 30.0);

      rawCandidates.push({
        storeId: store.id,
        storeCode: store.storeCode,
        storeName: store.name,
        availableStock: Number(availableStock.toFixed(3)),
        minimumStock: Number(minimumStock.toFixed(3)),
        ads: Number(ads.toFixed(3)),
        currentDOI,
        postTransferDOI,
        maxSafeTransferQty: maxSafeTransfer,
        distanceKm,
        excessStockQty,
        excessDOI,
      });
    }

    if (rawCandidates.length === 0) {
      return [];
    }

    const maxExcessQty = Math.max(
      ...rawCandidates.map((c) => c.excessStockQty),
      0,
    );
    const maxExcessDOI = Math.max(...rawCandidates.map((c) => c.excessDOI), 0);

    const scoredCandidates: CandidateStoreDto[] = rawCandidates.map((c) => {
      const normQty = maxExcessQty > 0 ? c.excessStockQty / maxExcessQty : 1.0;
      const normDOI = maxExcessDOI > 0 ? c.excessDOI / maxExcessDOI : 1.0;
      const suitabilityScore = Number((normQty * 60 + normDOI * 40).toFixed(2));

      return {
        storeId: c.storeId,
        storeCode: c.storeCode,
        storeName: c.storeName,
        availableStock: c.availableStock,
        ads: c.ads,
        currentDOI: c.currentDOI,
        postTransferDOI: c.postTransferDOI,
        maxSafeTransferQty: c.maxSafeTransferQty,
        distanceKm: c.distanceKm,
        suitabilityScore,
        rank: 0,
      };
    });

    // Primary sort: suitabilityScore DESC
    // Primary tie-breaker: distanceKm ASC (shortest road distance wins)
    // Secondary tie-breaker: availableStock DESC
    scoredCandidates.sort((a, b) => {
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return b.availableStock - a.availableStock;
    });

    return scoredCandidates.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
  }
}
