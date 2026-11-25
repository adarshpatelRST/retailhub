export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export interface CandidateStore {
  storeId: string;
  storeName: string;
  distanceKm: number;
  availableStock: number;
  rollingAds: number;
  currentDoi: number;
  projectedPostDoi: number;
  maxTransferableStock: number;
  isEligible: boolean;
}

export class RebalanceService {
  evaluateCandidate(
    donorStock: number,
    donorAds: number,
    transferQty: number,
  ): { eligible: boolean; transferableStock: number; projectedPostDoi: number } {
    // 7-day donor DOI safety floor
    const safetyFloorQty = donorAds * 7;
    const surplus = donorStock - safetyFloorQty;

    if (surplus <= 0) {
      return { eligible: false, transferableStock: 0, projectedPostDoi: 0 };
    }

    const transferableStock = Math.min(surplus, transferQty);
    const postStock = donorStock - transferableStock;
    const projectedPostDoi = donorAds > 0 ? postStock / donorAds : 999.0;

    return {
      eligible: projectedPostDoi >= 7.0,
      transferableStock: parseFloat(transferableStock.toFixed(3)),
      projectedPostDoi: parseFloat(projectedPostDoi.toFixed(1)),
    };
  }
}

export const rebalanceService = new RebalanceService();
