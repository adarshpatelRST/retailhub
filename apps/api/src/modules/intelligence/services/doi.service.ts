import { Injectable } from '@nestjs/common';

export type RiskTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type StockBufferStatus = 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS';

@Injectable()
export class DoiService {
  /**
   * Deterministic Days of Inventory (DOI) Formula:
   * - If `availableQuantity <= 0`: returns `0.0`
   * - If `ads <= 0 && availableQuantity > 0`: returns `999.0` (Dormant / Dead Stock)
   * - Otherwise: `Number((availableQuantity / ads).toFixed(2))`
   */
  calculateDOI(availableQuantity: number, ads: number): number {
    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
      return 0.0;
    }

    if (!Number.isFinite(ads) || ads <= 0) {
      return 999.0;
    }

    return Number((availableQuantity / ads).toFixed(2));
  }

  /**
   * Risk Tier Classification based on Days of Inventory:
   * - `HIGH`:   `doi <= 3.0`
   * - `MEDIUM`: `3.0 < doi <= 7.0`
   * - `LOW`:    `doi > 7.0`
   */
  classifyRisk(doi: number): RiskTier {
    if (doi <= 3.0) {
      return 'HIGH';
    }
    if (doi <= 7.0) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Stock Buffer Status Classification:
   * - `CRITICAL`: `availableQuantity <= 0`
   * - `LOW`:      `availableQuantity <= reorderLevel`
   * - `EXCESS`:   `availableQuantity > maximumStock || doi > 30.0`
   * - `HEALTHY`:  normal operating buffer
   */
  classifyStatus(
    availableQuantity: number,
    reorderLevel: number,
    maximumStock: number,
    doi: number,
  ): StockBufferStatus {
    if (availableQuantity <= 0) {
      return 'CRITICAL';
    }
    if (availableQuantity <= reorderLevel) {
      return 'LOW';
    }
    if (availableQuantity > maximumStock || doi > 30.0) {
      return 'EXCESS';
    }
    return 'HEALTHY';
  }
}
