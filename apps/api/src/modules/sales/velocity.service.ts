import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

@Injectable()
export class VelocityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes Rolling Average Daily Sales (ADS) for a single `(storeId, productId)` pair:
   * `ADS = SUM(SalesTransactionLine.quantity) / windowDays`
   *
   * Explicit zero-handling: If `windowDays <= 0` or total sales in the window is 0/null,
   * returns `0.000` (preventing downstream division-by-zero errors in Days-of-Supply calculations).
   */
  async getAverageDailySales(
    storeId: string,
    productId: string,
    windowDays: number = 30,
  ): Promise<number> {
    const safeWindowDays =
      Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - safeWindowDays);

    const result = await this.prisma.salesTransactionLine.aggregate({
      where: {
        productId,
        salesTransaction: {
          storeId,
          transactionDate: { gte: cutoffDate },
        },
      },
      _sum: { quantity: true },
    });

    const totalQty = Number(result._sum.quantity || 0);
    if (totalQty <= 0) {
      return Number((0).toFixed(3));
    }

    const ads = totalQty / safeWindowDays;
    return Number(ads.toFixed(3));
  }

  /**
   * Computes a dictionary of `{ [productId]: averageDailySales }` for all products sold
   * in `storeId` over the rolling `windowDays` window using a single `groupBy` query.
   */
  async getStoreVelocityMap(
    storeId: string,
    windowDays: number = 30,
  ): Promise<Record<string, number>> {
    const safeWindowDays =
      Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - safeWindowDays);

    const groupedLines = await this.prisma.salesTransactionLine.groupBy({
      by: ['productId'],
      where: {
        salesTransaction: {
          storeId,
          transactionDate: { gte: cutoffDate },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const velocityMap: Record<string, number> = {};

    for (const row of groupedLines) {
      const totalQty = Number(row._sum.quantity || 0);
      const ads = totalQty > 0 ? totalQty / safeWindowDays : 0;
      velocityMap[row.productId] = Number(ads.toFixed(3));
    }

    return velocityMap;
  }
}
