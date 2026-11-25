import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { EvaluationResultDto, RebalanceService } from '@/modules/intelligence';

export interface GoldenPathSeedResult {
  sku: string;
  productName: string;
  destinationStore: {
    storeCode: string;
    availableStock: number;
    ads: number;
    doiDays: number;
  };
  donorStore: {
    storeCode: string;
    availableStock: number;
    ads: number;
    doiDays: number;
  };
  evaluationResult: EvaluationResultDto;
  liveRecommendationNumber: string | null;
}

@Injectable()
export class GoldenPathSeeder {
  private readonly logger = new Logger(GoldenPathSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rebalanceService: RebalanceService,
  ) {}

  /**
   * Seeds the exact Bhopal-Indore Golden Path Scenario (BRD Section 37):
   * - SKU-1024 ("Fortune Sunflower Oil 1L", barcode 8901030383742, MRP 150, SellingPrice 135, CostPrice 110)
   * - Destination: Bhopal MP Nagar Store (`BPL-001`): Stock = 3.000 units, ADS = 2.100 units/day (63 units over 30d), DOI = 1.43 days (HIGH Risk)
   * - Source: Indore Vijay Nagar Store (`IND-001`): Stock = 55.000 units, ADS = 0.500 units/day (15 units over 30d), DOI = 110.0 days (EXCESS)
   * - Automatically runs `RebalanceService.evaluateStore` for Bhopal and normalizes the recommendation number to `REC-1001`.
   */
  async run(params: {
    bhopalStoreId: string;
    indoreStoreId: string;
    sku1024ProductId: string;
  }): Promise<GoldenPathSeedResult> {
    this.logger.log(
      'Seeding Bhopal (BPL-001) & Indore (IND-001) Golden Path Scenario for SKU-1024...',
    );

    const { bhopalStoreId, indoreStoreId, sku1024ProductId } = params;

    // 1. Upsert Bhopal MP Nagar Store (BPL-001) Inventory: 3.000 units (HIGH Risk)
    await this.prisma.inventory.upsert({
      where: {
        storeId_productId: {
          storeId: bhopalStoreId,
          productId: sku1024ProductId,
        },
      },
      update: {
        availableQuantity: 3.0,
        reservedQuantity: 0.0,
        inTransitQuantity: 0.0,
        minimumStock: 10.0,
        maximumStock: 80.0,
        reorderLevel: 20.0,
      },
      create: {
        storeId: bhopalStoreId,
        productId: sku1024ProductId,
        availableQuantity: 3.0,
        reservedQuantity: 0.0,
        inTransitQuantity: 0.0,
        minimumStock: 10.0,
        maximumStock: 80.0,
        reorderLevel: 20.0,
      },
    });

    // 2. Upsert Indore Vijay Nagar Store (IND-001) Inventory: 55.000 units (EXCESS Donor)
    await this.prisma.inventory.upsert({
      where: {
        storeId_productId: {
          storeId: indoreStoreId,
          productId: sku1024ProductId,
        },
      },
      update: {
        availableQuantity: 55.0,
        reservedQuantity: 0.0,
        inTransitQuantity: 0.0,
        minimumStock: 10.0,
        maximumStock: 45.0,
        reorderLevel: 15.0,
      },
      create: {
        storeId: indoreStoreId,
        productId: sku1024ProductId,
        availableQuantity: 55.0,
        reservedQuantity: 0.0,
        inTransitQuantity: 0.0,
        minimumStock: 10.0,
        maximumStock: 45.0,
        reorderLevel: 15.0,
      },
    });

    // 3. Seed 30-day POS Sales for Bhopal (63.000 units / 30 days = 2.100 ADS -> DOI = 3.0 / 2.1 = 1.43 days)
    const recentTxDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await this.prisma.salesTransaction.create({
      data: {
        transactionNumber: `POS-GP-BPL-${Date.now()}`,
        storeId: bhopalStoreId,
        transactionDate: recentTxDate,
        customerId: 'GOLDEN_PATH_BASELINE',
        totalQuantity: 63.0,
        totalAmount: 63.0 * 135.0,
        lines: {
          create: [
            {
              productId: sku1024ProductId,
              quantity: 63.0,
              unitPrice: 135.0,
              discount: 0.0,
              netAmount: 63.0 * 135.0,
            },
          ],
        },
      },
    });

    // 4. Seed 30-day POS Sales for Indore (15.000 units / 30 days = 0.500 ADS -> DOI = 55.0 / 0.5 = 110.0 days)
    await this.prisma.salesTransaction.create({
      data: {
        transactionNumber: `POS-GP-IND-${Date.now()}`,
        storeId: indoreStoreId,
        transactionDate: recentTxDate,
        customerId: 'GOLDEN_PATH_BASELINE',
        totalQuantity: 15.0,
        totalAmount: 15.0 * 135.0,
        lines: {
          create: [
            {
              productId: sku1024ProductId,
              quantity: 15.0,
              unitPrice: 135.0,
              discount: 0.0,
              netAmount: 15.0 * 135.0,
            },
          ],
        },
      },
    });

    // 5. Trigger RebalanceService.evaluateStore for Bhopal so REC-1001 is immediately live in the Action Center
    const evaluationResult =
      await this.rebalanceService.evaluateStore(bhopalStoreId);

    const generatedRec = await this.prisma.recommendation.findFirst({
      where: {
        storeId: bhopalStoreId,
        productId: sku1024ProductId,
      },
      orderBy: { createdAt: 'desc' },
    });

    let liveRecommendationNumber: string | null = null;
    if (generatedRec) {
      const updated = await this.prisma.recommendation.update({
        where: { id: generatedRec.id },
        data: {
          recommendationNumber: 'REC-1001',
        },
      });
      liveRecommendationNumber = updated.recommendationNumber;
    }

    return {
      sku: 'SKU-1024',
      productName: 'Fortune Sunflower Oil 1L',
      destinationStore: {
        storeCode: 'BPL-001',
        availableStock: 3.0,
        ads: 2.1,
        doiDays: 1.43,
      },
      donorStore: {
        storeCode: 'IND-001',
        availableStock: 55.0,
        ads: 0.5,
        doiDays: 110.0,
      },
      evaluationResult,
      liveRecommendationNumber,
    };
  }
}
