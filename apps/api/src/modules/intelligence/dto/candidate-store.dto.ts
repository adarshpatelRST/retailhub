export class CandidateStoreDto {
  storeId!: string;
  storeCode!: string;
  storeName!: string;
  availableStock!: number;
  ads!: number;
  currentDOI!: number;
  postTransferDOI!: number;
  maxSafeTransferQty!: number;
  distanceKm!: number;
  suitabilityScore!: number;
  rank!: number;
}
