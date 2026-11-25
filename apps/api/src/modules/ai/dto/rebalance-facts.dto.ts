export class RebalanceFactsDto {
  recommendationId!: string;
  recommendationType!: 'REBALANCE_TRANSFER' | 'CENTRAL_SUPPLY_ORDER' | 'MANUAL_STORE_REQUEST';
  priority!: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  productName!: string;
  sku!: string;
  recommendedQuantity!: number;

  // Destination Store (Stockout Risk Store)
  destStoreName!: string;
  destStoreCode!: string;
  destAvailableStock!: number;
  destADS!: number;
  destCurrentDOI!: number;
  destTargetDOI!: number;

  // Source Store (Regional Donor Store — null if Central Supply fallback)
  sourceStoreName?: string | null;
  sourceStoreCode?: string | null;
  sourceAvailableStock?: number | null;
  sourceADS?: number | null;
  sourceCurrentDOI?: number | null;
  sourcePostTransferDOI?: number | null;
  distanceKm?: number | null;
}
