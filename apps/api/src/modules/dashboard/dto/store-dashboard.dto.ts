import { InventoryHealthDistributionDto } from './executive-dashboard.dto';

export interface StoreImmediateRiskItemDto {
  productId: string;
  sku: string;
  productName: string;
  availableQuantity: number;
  reorderLevel: number;
  ads: number;
  doiDays: number;
  doiHours: number;
}

export interface IncomingTransferShipmentDto {
  transferId: string;
  transferNumber: string;
  fromStoreId: string;
  fromStoreCode: string;
  fromStoreName: string;
  status: string;
  carrierName: string | null;
  vehicleNumber: string | null;
  dispatchNoteNumber: string | null;
  estimatedArrival: string | null;
  dispatchedAt: string | null;
  totalUnits: number;
  lineCount: number;
}

export class StoreDashboardDto {
  store!: {
    id: string;
    storeCode: string;
    name: string;
    city: string;
    regionCode: string;
    regionName: string;
  };
  salesMetrics!: {
    salesToday: number;
    dailyTarget: number;
    dailyAchievementPercent: number;
    mtdSales: number;
    mtdTarget: number;
    mtdAchievementPercent: number;
  };
  healthBreakdown!: InventoryHealthDistributionDto;
  immediateRiskSkus!: StoreImmediateRiskItemDto[];
  incomingTransfers!: IncomingTransferShipmentDto[];
  openStoreRecommendationsCount!: number;
  generatedAt!: string;
}
