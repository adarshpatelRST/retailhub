import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, SalesTransaction } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { PaginatedResponse } from '@/core/common/api-response.dto';
import { StoreScopedFilter } from '@/core/security/data-scope.decorator';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { BatchSalesDto } from './dto/batch-sales.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { SalesSummaryDto } from './dto/sales-summary.dto';

export interface SaleIngestionResult extends SalesTransaction {
  negativeStockAlerts: Array<{
    storeId: string;
    productId: string;
    availableQuantityAfterSale: string;
  }>;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Normalizes a DataScopeGuard filter (whether `@DataScope('store')` or `@DataScope()`)
   * into a valid `Prisma.SalesTransactionWhereInput` clause.
   */
  private resolveSalesScopeWhere(
    dataScope?: StoreScopedFilter,
  ): Prisma.SalesTransactionWhereInput {
    if (!dataScope) {
      return {};
    }

    const scopedStoreIds = dataScope.storeId?.in ?? dataScope.id?.in;
    if (scopedStoreIds) {
      return {
        storeId: { in: scopedStoreIds },
      };
    }

    const scopedRegionIds =
      dataScope.store?.regionId?.in ?? dataScope.regionId?.in;
    if (scopedRegionIds) {
      return {
        store: {
          regionId: { in: scopedRegionIds },
        },
      };
    }

    return {};
  }

  /**
   * Atomically ingests a single POS checkout receipt:
   * 1. Enforces unique `transactionNumber` (`SALES_DUPLICATE_TX`).
   * 2. Snapshots point-in-time `unitPrice`, `discount`, and `netAmount` on `SalesTransactionLine`.
   * 3. Lazily creates or updates `Inventory` for each line, allowing `availableQuantity`
   *    to drop below zero without blocking physical checkout lanes.
   * 4. Appends an immutable `InventoryMovement` (`movementType = 'POS_SALE'`) per line.
   */
  async createSale(dto: CreateSaleDto): Promise<SaleIngestionResult> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException({
        code: 'SALES_EMPTY_LINES',
        message: 'POS transaction must contain at least one line item.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const normalizedTxNumber = dto.transactionNumber.trim();

      const existingTx = await tx.salesTransaction.findUnique({
        where: { transactionNumber: normalizedTxNumber },
        select: { id: true },
      });

      if (existingTx) {
        throw new ConflictException({
          code: 'SALES_DUPLICATE_TX',
          message: `Sales transaction '${normalizedTxNumber}' has already been recorded.`,
        });
      }

      let totalQuantity = new Prisma.Decimal('0.000');
      let totalAmount = new Prisma.Decimal('0.00');

      const lineCreates: Prisma.SalesTransactionLineCreateWithoutSalesTransactionInput[] =
        dto.lines.map((line) => {
          const lineQty = new Prisma.Decimal(line.quantity.toFixed(3));
          const lineUnitPrice = new Prisma.Decimal(line.unitPrice.toFixed(2));
          const lineDiscount = new Prisma.Decimal(
            (line.discount ?? 0).toFixed(2),
          );
          const lineNetAmount = new Prisma.Decimal(line.netAmount.toFixed(2));

          totalQuantity = totalQuantity.add(lineQty);
          totalAmount = totalAmount.add(lineNetAmount);

          return {
            product: { connect: { id: line.productId } },
            quantity: lineQty,
            unitPrice: lineUnitPrice,
            discount: lineDiscount,
            netAmount: lineNetAmount,
          };
        });

      const transactionDate = dto.transactionDate
        ? new Date(dto.transactionDate)
        : new Date();

      const createdTransaction = await tx.salesTransaction.create({
        data: {
          transactionNumber: normalizedTxNumber,
          storeId: dto.storeId,
          transactionDate,
          totalQuantity,
          totalAmount,
          lines: {
            create: lineCreates,
          },
        },
        include: {
          store: {
            select: {
              id: true,
              storeCode: true,
              name: true,
              city: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  productCode: true,
                  name: true,
                  unitOfMeasure: true,
                },
              },
            },
          },
        },
      });

      const negativeStockAlerts: Array<{
        storeId: string;
        productId: string;
        availableQuantityAfterSale: string;
      }> = [];

      for (const line of dto.lines) {
        const lineQty = new Prisma.Decimal(line.quantity.toFixed(3));

        const inventory = await this.inventoryService.getOrCreateBalance(
          dto.storeId,
          line.productId,
          tx,
        );

        const updatedAvailable = new Prisma.Decimal(
          inventory.availableQuantity,
        ).sub(lineQty);

        const updatedInventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            availableQuantity: updatedAvailable,
            version: { increment: 1 },
            lastUpdatedOn: new Date(),
          },
        });

        if (updatedAvailable.lt(new Prisma.Decimal('0.000'))) {
          negativeStockAlerts.push({
            storeId: dto.storeId,
            productId: line.productId,
            availableQuantityAfterSale: updatedAvailable.toFixed(3),
          });
        }

        await tx.inventoryMovement.create({
          data: {
            inventoryId: updatedInventory.id,
            movementType: 'POS_SALE',
            quantity: lineQty.negated(),
            referenceType: 'SALES_TRANSACTION',
            referenceId: createdTransaction.id,
            remarks: dto.customerId
              ? `POS Invoice ${normalizedTxNumber} (Customer: ${dto.customerId})`
              : `POS Invoice ${normalizedTxNumber}`,
            createdBy: 'POS_TERMINAL',
            movementDate: transactionDate,
          },
        });
      }

      return {
        ...createdTransaction,
        negativeStockAlerts,
      };
    });
  }

  /**
   * High-throughput batch ingestion for offline/buffered POS checkout lanes.
   */
  async createBatch(dto: BatchSalesDto): Promise<{
    processedCount: number;
    successfulTxNumbers: string[];
  }> {
    const successfulTxNumbers: string[] = [];

    for (const saleDto of dto.transactions) {
      const created = await this.createSale(saleDto);
      successfulTxNumbers.push(created.transactionNumber);
    }

    return {
      processedCount: successfulTxNumbers.length,
      successfulTxNumbers,
    };
  }

  /**
   * Lists POS sales transactions scoped to the authenticated user's stores/regions.
   */
  async findAll(
    query: SalesQueryDto,
    dataScope?: StoreScopedFilter,
  ): Promise<PaginatedResponse<SalesTransaction>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const scopeWhere = this.resolveSalesScopeWhere(dataScope);
    const andConditions: Prisma.SalesTransactionWhereInput[] = [scopeWhere];

    if (query.storeId) {
      andConditions.push({ storeId: query.storeId });
    }

    if (query.productId) {
      andConditions.push({
        lines: {
          some: {
            productId: query.productId,
          },
        },
      });
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }
      andConditions.push({ transactionDate: dateFilter });
    }

    const where: Prisma.SalesTransactionWhereInput = {
      AND: andConditions,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salesTransaction.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              storeCode: true,
              name: true,
              city: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  productCode: true,
                  name: true,
                  unitOfMeasure: true,
                },
              },
            },
          },
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.salesTransaction.count({ where }),
    ]);

    return PaginatedResponse.create(items, total, page, limit);
  }

  /**
   * Computes aggregated POS sales KPIs (Total Revenue, Total Units Sold,
   * Total Transaction Count, and Average Basket Value) across a date window.
   */
  async getSummary(
    storeId?: string,
    startDate?: Date,
    endDate?: Date,
    dataScope?: StoreScopedFilter,
  ): Promise<SalesSummaryDto> {
    const scopeWhere = this.resolveSalesScopeWhere(dataScope);
    const andConditions: Prisma.SalesTransactionWhereInput[] = [scopeWhere];

    if (storeId) {
      andConditions.push({ storeId });
    }

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        dateFilter.gte = startDate;
      }
      if (endDate) {
        dateFilter.lte = endDate;
      }
      andConditions.push({ transactionDate: dateFilter });
    }

    const where: Prisma.SalesTransactionWhereInput = {
      AND: andConditions,
    };

    const aggregate = await this.prisma.salesTransaction.aggregate({
      where,
      _sum: {
        totalAmount: true,
        totalQuantity: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenueDecimal = new Prisma.Decimal(
      aggregate._sum.totalAmount ?? 0,
    );
    const totalUnitsDecimal = new Prisma.Decimal(
      aggregate._sum.totalQuantity ?? 0,
    );
    const txCount = aggregate._count.id ?? 0;

    const averageBasketDecimal =
      txCount > 0
        ? totalRevenueDecimal.div(new Prisma.Decimal(txCount))
        : new Prisma.Decimal('0.00');

    return {
      storeId: storeId ?? null,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      totalRevenue: totalRevenueDecimal.toFixed(2),
      totalUnitsSold: totalUnitsDecimal.toFixed(3),
      totalTransactionCount: txCount,
      averageBasketValue: averageBasketDecimal.toFixed(2),
    };
  }
}
