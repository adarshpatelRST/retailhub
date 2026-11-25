export type DoiStockStatus = "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS";

export class DoiService {
  calculateDoi(availableStock: number, rollingAds: number): number {
    if (rollingAds <= 0) {
      return availableStock > 0 ? 999.0 : 0.0;
    }
    return parseFloat((availableStock / rollingAds).toFixed(1));
  }

  classifyStatus(doi: number): DoiStockStatus {
    if (doi < 3.0) return "CRITICAL";
    if (doi < 7.0) return "LOW";
    if (doi <= 30.0) return "HEALTHY";
    return "EXCESS";
  }
}

export const doiService = new DoiService();
