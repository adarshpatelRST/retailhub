import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Brand,
  Category,
  Inventory,
  InventoryMovement,
  InventoryRule,
  MovementType,
  Prisma,
  Product,
  Region,
  Store,
  StoreType,
} from '@prisma/client';
import { PaginatedResponse } from '@/core/common/api-response.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { StoreScopedFilter } from '@/core/security/data-scope.decorator';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import {
  InventoryQueryDto,
  StockHealthStatus,
} from './dto/inventory-query.dto';
import { InventoryRuleDto } from './dto/inventory-rule.dto';

export type InventoryWithRelations = Inventory & {
  product: Product & {
    brand: Brand;
    category: Category;
  };
  store: Store & {
    region: Region;
    storeType: StoreType;
  };
  stockStatus: StockHealthStatus;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes dynamic stock status using exact `Prisma.Decimal` comparisons:
   * - `availableQuantity <= 0`            -> `'CRITICAL'`
   * - `availableQuantity <= reorderLevel` -> `'LOW'`
   * - `availableQuantity > maximumStock`  -> `'EXCESS'`
   * - Otherwise                           -> `'HEALTHY'`
   */
  public computeStockStatus(
    availableQuantity: Prisma.Decimal,
    reorderLevel: Prisma.Decimal,
    maximumStock: Prisma.Decimal,
  ): StockHealthStatus {
    const zero = new Prisma.Decimal(0);
    if (availableQuantity.lessThanOrEqualTo(zero)) {
      return 'CRITICAL';
    }
    if (availableQuantity.lessThanOrEqualTo(reorderLevel)) {
      return 'LOW';
    }
    if (availableQuantity.greaterThan(maximumStock)) {
      return 'EXCESS';
    }
    return 'HEALTHY';
  }

  /**
   * Queries inventory balances merged with server-side `dataScope` constraints,
   * joining `product` (brand/category) and `store` (region/storeType) and computing
   * `stockStatus` dynamically.
   */
  async findAll(
    query: InventoryQueryDto,
    dataScope?: StoreScopedFilter,
  ): Promise<PaginatedResponse<InventoryWithRelations>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));

    const where: Prisma.InventoryWhereInput = {
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };

    if (dataScope) {
      const scopedStoreIds = dataScope.storeId?.in ?? dataScope.id?.in;
      const scopedRegionIds =
        dataScope.store?.regionId?.in ?? dataScope.regionId?.in;

      if (scopedStoreIds) {
        if (query.storeId) {
          const allowed = scopedStoreIds.includes(query.storeId)
            ? [query.storeId]
            : [];
          where.storeId = { in: allowed };
        } else {
          where.storeId = { in: scopedStoreIds };
        }
      }

      if (scopedRegionIds) {
        where.store = {
          regionId: { in: scopedRegionIds },
        };
      }
    }

    if (query.search && query.search.trim().length > 0) {
      const search = query.search.trim();
      where.product = {
        OR: [
          { productCode: search },
          { sku: { contains: search.toUpperCase() } },
          { name: { contains: search } },
        ],
      };
    }

    const records = await this.prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
        store: {
          include: {
            region: true,
            storeType: true,
          },
        },
      },
      orderBy: [{ store: { storeCode: 'asc' } }, { product: { sku: 'asc' } }],
    });

    const enriched: InventoryWithRelations[] = records.map((row) => ({
      ...row,
      stockStatus: this.computeStockStatus(
        row.availableQuantity,
        row.reorderLevel,
        row.maximumStock,
      ),
    }));

    const filtered = query.status
      ? enriched.filter((item) => item.stockStatus === query.status)
      : enriched;

    const totalItems = filtered.length;
    const pagedItems = filtered.slice((page - 1) * limit, page * limit);

    return new PaginatedResponse<InventoryWithRelations>(
      pagedItems,
      totalItems,
      page,
      limit,
    );
  }

  /**
   * Fetches balance for `(storeId, productId)` including `availableQuantity`,
   * `reservedQuantity`, `inTransitQuantity`, and `version`.
   * If not found, lazily creates and returns a zero balance row (`availableQuantity: 0.000, version: 1`).
   */
  async getBalance(storeId: string, productId: string): Promise<Inventory> {
    const existing = await this.prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId,
          productId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const [store, product] = await Promise.all([
      this.prisma.store.findUnique({ where: { id: storeId } }),
      this.prisma.product.findUnique({ where: { id: productId } }),
    ]);

    if (!store) {
      throw new NotFoundException(`Store with ID '${storeId}' was not found.`);
    }

    if (!product) {
      throw new NotFoundException(
        `Product with ID '${productId}' was not found.`,
      );
    }

    return this.prisma.inventory.upsert({
      where: {
        storeId_productId: {
          storeId,
          productId,
        },
      },
      update: {},
      create: {
        storeId,
        productId,
        availableQuantity: new Prisma.Decimal('0.000'),
        reservedQuantity: new Prisma.Decimal('0.000'),
        inTransitQuantity: new Prisma.Decimal('0.000'),
        minimumStock: new Prisma.Decimal('10.000'),
        maximumStock: new Prisma.Decimal('100.000'),
        reorderLevel: new Prisma.Decimal('20.000'),
        version: 1,
      },
    });
  }

  /**
   * Performs an atomic manual stock adjustment / cycle count / damaged write-off:
   * 1. Lazily initializes the `(storeId, productId)` balance row if missing.
   * 2. Verifies optimistic lock (`version === dto.expectedVersion`). Throws `ConflictException('INV_CONCURRENCY_CONFLICT')` on mismatch.
   * 3. Computes `newAvailable = availableQuantity + quantityDelta` using `Prisma.Decimal`. Throws `BadRequestException('INV_INSUFFICIENT_STOCK')` if `< 0`.
   * 4. Updates `availableQuantity` and increments `version = version + 1`.
   * 5. Inserts immutable `InventoryMovement` ledger record (`STOCK_ADJUSTMENT` or `DAMAGED_WRITE_OFF`).
   */
  async adjustStock(
    dto: AdjustStockDto,
    userId: string,
  ): Promise<{
    inventory: Inventory;
    movement: InventoryMovement;
  }> {
    // Ensure lazy balance initialization before entering optimistic-locked transaction
    await this.getBalance(dto.storeId, dto.productId);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({
        where: {
          storeId_productId: {
            storeId: dto.storeId,
            productId: dto.productId,
          },
        },
      });

      if (!current) {
        throw new NotFoundException('Inventory balance row not found.');
      }

      if (current.version !== dto.expectedVersion) {
        throw new ConflictException('INV_CONCURRENCY_CONFLICT');
      }

      const deltaDecimal = new Prisma.Decimal(dto.quantityDelta);
      const zero = new Prisma.Decimal(0);
      const newAvailable = current.availableQuantity.plus(deltaDecimal);

      if (newAvailable.lessThan(zero)) {
        throw new BadRequestException('INV_INSUFFICIENT_STOCK');
      }

      const updateResult = await tx.inventory.updateMany({
        where: {
          id: current.id,
          version: dto.expectedVersion,
        },
        data: {
          availableQuantity: newAvailable,
          version: {
            increment: 1,
          },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('INV_CONCURRENCY_CONFLICT');
      }

      const updatedInventory = await tx.inventory.findUniqueOrThrow({
        where: { id: current.id },
      });

      const movementType: MovementType = deltaDecimal.greaterThan(zero)
        ? MovementType.STOCK_ADJUSTMENT
        : MovementType.DAMAGED_WRITE_OFF;

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: current.id,
          movementType,
          quantity: deltaDecimal,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: current.id,
          remarks: dto.remarks.trim(),
          createdBy: userId,
        },
      });

      return {
        inventory: updatedInventory,
        movement,
      };
    });
  }

  /**
   * Returns paginated double-entry ledger history from `InventoryMovement`
   * sorted by `movementDate DESC`.
   */
  async getMovements(
    storeId: string,
    productId: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(200, limit));
    const skip = (safePage - 1) * safeLimit;

    const inventory = await this.prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId,
          productId,
        },
      },
    });

    if (!inventory) {
      return new PaginatedResponse<InventoryMovement>([], 0, safePage, safeLimit);
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: { inventoryId: inventory.id },
        orderBy: { movementDate: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.inventoryMovement.count({
        where: { inventoryId: inventory.id },
      }),
    ]);

    return new PaginatedResponse<InventoryMovement>(
      items,
      totalItems,
      safePage,
      safeLimit,
    );
  }

  /**
   * Lists active `InventoryRule` configurations.
   */
  async getRules(
    storeId?: string,
    productId?: string,
  ): Promise<InventoryRule[]> {
    return this.prisma.inventoryRule.findMany({
      where: {
        isActive: true,
        ...(storeId ? { storeId } : {}),
        ...(productId ? { productId } : {}),
      },
      include: {
        store: true,
        product: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Creates a new `InventoryRule` row enforcing SCD Type 2 effective-date versioning.
   * If an active rule exists for `(storeId, productId)`, expires it (`effectiveTo = now()`, `isActive = false`)
   * before inserting the new versioned rule, and synchronizes thresholds on the `Inventory` balance row.
   */
  async saveRule(dto: InventoryRuleDto): Promise<InventoryRule> {
    const now = new Date();
    const effectiveFromDate = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : now;
    const effectiveToDate = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const minDec = new Prisma.Decimal(dto.minimumStock);
    const maxDec = new Prisma.Decimal(dto.maximumStock);
    const reorderDec = new Prisma.Decimal(dto.reorderLevel);
    const safetyDec = new Prisma.Decimal(dto.safetyStock);

    if (minDec.greaterThan(maxDec)) {
      throw new BadRequestException(
        'minimumStock cannot be greater than maximumStock.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existingActiveRule = await tx.inventoryRule.findFirst({
        where: {
          storeId: dto.storeId,
          productId: dto.productId,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      let nextVersion = 1;

      if (existingActiveRule) {
        nextVersion = existingActiveRule.version + 1;
        await tx.inventoryRule.update({
          where: { id: existingActiveRule.id },
          data: {
            effectiveTo: now,
            isActive: false,
          },
        });
      }

      const createdRule = await tx.inventoryRule.create({
        data: {
          storeId: dto.storeId,
          productId: dto.productId,
          minimumStock: minDec,
          maximumStock: maxDec,
          reorderLevel: reorderDec,
          safetyStock: safetyDec,
          effectiveFrom: effectiveFromDate,
          effectiveTo: effectiveToDate,
          isActive: true,
          version: nextVersion,
        },
      });

      // Synchronize threshold defaults onto the active Inventory balance row if it exists
      await tx.inventory.updateMany({
        where: {
          storeId: dto.storeId,
          productId: dto.productId,
        },
        data: {
          minimumStock: minDec,
          maximumStock: maxDec,
          reorderLevel: reorderDec,
        },
      });

      return createdRule;
    });
  }
}
