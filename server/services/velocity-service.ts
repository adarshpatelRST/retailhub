import { prisma } from "../db";
import { serializeDecimal } from "../utils/field-mapping";

export class VelocityService {
  /**
   * Computes 7-day rolling Average Daily Sales (ADS) for a store & SKU
   */
  async computeRollingAds(storeId: string, productId: string, days = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const lines = await prisma.salesTransactionLine.findMany({
      where: {
        productId,
        salesTransaction: {
          storeId,
          transactionDate: { gte: cutoff },
        },
      },
      select: { quantity: true },
    });

    if (lines.length === 0) return 0.0;

    const totalQty = lines.reduce((acc, l) => acc + serializeDecimal(l.quantity), 0);
    return parseFloat((totalQty / days).toFixed(3));
  }
}

export const velocityService = new VelocityService();
