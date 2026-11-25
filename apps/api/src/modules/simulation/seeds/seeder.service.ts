import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  MasterDataSeeder,
  MasterDataSeedSummary,
} from './master-data.seeder';
import {
  GoldenPathSeeder,
  GoldenPathSeedResult,
} from './golden-path.seeder';

export interface SeedDemoResponseDto {
  skipped: boolean;
  cleanResetExecuted: boolean;
  message: string;
  masterData?: MasterDataSeedSummary;
  goldenPath?: GoldenPathSeedResult;
  completedAt: string;
}

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly masterDataSeeder: MasterDataSeeder,
    private readonly goldenPathSeeder: GoldenPathSeeder,
  ) {}

  /**
   * Executes a cascading purge across all 21 Microsoft SQL Server tables in
   * strict reverse-dependency order so foreign-key constraints are never violated.
   */
  async cleanResetDatabase(): Promise<void> {
    this.logger.warn(
      'Executing cascading database purge in reverse-dependency order (21 tables)...',
    );

    await this.prisma.$executeRawUnsafe(`
      DELETE FROM ActionHistory;
      DELETE FROM [Action];
      DELETE FROM RecommendationEvidence;
      DELETE FROM Recommendation;
      DELETE FROM StockTransferLine;
      DELETE FROM StockTransfer;
      DELETE FROM InventoryMovement;
      DELETE FROM SalesTransactionLine;
      DELETE FROM SalesTransaction;
      DELETE FROM InventoryRule;
      DELETE FROM Inventory;
      DELETE FROM AuditLog;
      DELETE FROM Product;
      DELETE FROM Brand;
      DELETE FROM Category;
      DELETE FROM UserStoreAssignment;
      DELETE FROM UserRegionAssignment;
      DELETE FROM Store;
      DELETE FROM StoreType;
      DELETE FROM Region;
      DELETE FROM [User];
    `);
  }

  /**
   * Orchestrates the 50-Store / 500-SKU Master Data Seeder and the Bhopal-Indore
   * Golden Path Scenario (`REC-1001`):
   * - If `cleanReset: true`, purges all 21 tables first.
   * - If `cleanReset: false`, checks `prisma.store.count() > 0` idempotency guard.
   */
  async seedDemo(options?: {
    cleanReset?: boolean;
  }): Promise<SeedDemoResponseDto> {
    const cleanReset = options?.cleanReset ?? false;

    if (cleanReset) {
      await this.cleanResetDatabase();
    } else {
      const existingStoreCount = await this.prisma.store.count();
      if (existingStoreCount > 0) {
        this.logger.warn(
          `Idempotency Guard: Database already contains ${existingStoreCount} stores. Skipping seed (pass { cleanReset: true } to force purge and re-seed).`,
        );
        return {
          skipped: true,
          cleanResetExecuted: false,
          message: `Database already seeded (${existingStoreCount} stores found). Skipped duplicate seed execution.`,
          completedAt: new Date().toISOString(),
        };
      }
    }

    const masterData = await this.masterDataSeeder.run();
    const goldenPath = await this.goldenPathSeeder.run({
      bhopalStoreId: masterData.bhopalStoreId,
      indoreStoreId: masterData.indoreStoreId,
      sku1024ProductId: masterData.sku1024ProductId,
    });

    return {
      skipped: false,
      cleanResetExecuted: cleanReset,
      message: `Successfully seeded ${masterData.storesSeeded} stores, ${masterData.productsSeeded} SKUs, 6 months POS sales, and Bhopal-Indore Golden Path (${goldenPath.liveRecommendationNumber}).`,
      masterData,
      goldenPath,
      completedAt: new Date().toISOString(),
    };
  }
}
