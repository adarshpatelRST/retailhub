export class EvaluationResultDto {
  evaluatedStores!: number;
  evaluatedSKUs!: number;
  highRiskDetected!: number;
  newRecommendationsCreated!: number;
  existingRecommendationsRefreshed!: number;
  autoExpiredCount!: number;
  timestamp!: string;
}
