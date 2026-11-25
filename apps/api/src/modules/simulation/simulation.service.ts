import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import {
  SalesService,
  SaleIngestionResult,
} from '@/modules/sales/sales.service';
import { VelocityService } from '@/modules/sales/velocity.service';
import { SalesSpikeDto } from './dto/sales-spike.dto';

export interface SalesSpikeSimulationResult {
  transaction: SaleIngestionResult;
  updatedInventory: {
    inventoryId: string;
    storeId: string;
    productId: string;
    availableQuantity: string;
    minimumStock: string;
    reorderLevel: string;
    version: number;
    isNegativeStock: boolean;
  };
  rolling30DayAds: number;
}

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly velocityService: VelocityService,
  ) {}

  /**
   * Generates an on-demand synthetic POS sales burst (`SIM-SPIKE-<timestamp>`)
   * using the product's current `sellingPrice`, depletes store inventory via
   * `SalesService.createSale`, and returns the updated balance and rolling ADS.
   */
  async triggerSalesSpike(
    dto: SalesSpikeDto,
  ): Promise<SalesSpikeSimulationResult> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPrice: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'PROD_NOT_FOUND',
        message: `Product '${dto.productId}' does not exist.`,
      });
    }

    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
      select: {
        id: true,
        storeCode: true,
      },
    });

    if (!store) {
      throw new NotFoundException({
        code: 'STORE_NOT_FOUND',
        message: `Store '${dto.storeId}' does not exist.`,
      });
    }

    const quantityDecimal = new Prisma.Decimal(dto.unitsToSell.toFixed(3));
    const unitPriceDecimal = new Prisma.Decimal(product.sellingPrice);
    const netAmountDecimal = unitPriceDecimal.mul(quantityDecimal);

    const transactionNumber = `SIM-SPIKE-${Date.now()}`;

    const transaction = await this.salesService.createSale({
      transactionNumber,
      storeId: dto.storeId,
      transactionDate: new Date().toISOString(),
      customerId: 'SIMULATION_ENGINE',
      lines: [
        {
          productId: dto.productId,
          quantity: Number(quantityDecimal.toFixed(3)),
          unitPrice: Number(unitPriceDecimal.toFixed(2)),
          discount: 0,
          netAmount: Number(netAmountDecimal.toFixed(2)),
        },
      ],
    });

    const updatedInventoryRow = await this.prisma.inventory.findUniqueOrThrow({
      where: {
        storeId_productId: {
          storeId: dto.storeId,
          productId: dto.productId,
        },
      },
    });

    const availableDecimal = new Prisma.Decimal(
      updatedInventoryRow.availableQuantity,
    );
    const rolling30DayAds = await this.velocityService.getAverageDailySales(
      dto.storeId,
      dto.productId,
      30,
    );

    return {
      transaction,
      updatedInventory: {
        inventoryId: updatedInventoryRow.id,
        storeId: updatedInventoryRow.storeId,
        productId: updatedInventoryRow.productId,
        availableQuantity: availableDecimal.toFixed(3),
        minimumStock: new Prisma.Decimal(
          updatedInventoryRow.minimumStock,
        ).toFixed(3),
        reorderLevel: new Prisma.Decimal(
          updatedInventoryRow.reorderLevel,
        ).toFixed(3),
        version: updatedInventoryRow.version,
        isNegativeStock: availableDecimal.lt(new Prisma.Decimal('0.000')),
      },
      rolling30DayAds,
    };
  }
}
