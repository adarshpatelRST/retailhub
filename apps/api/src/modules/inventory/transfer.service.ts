import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MovementType,
  Prisma,
  StockTransfer,
  StockTransferLine,
  TransferStatus,
} from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { StoreScopedFilter } from '@/core/security/data-scope.decorator';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { DispatchTransferDto } from './dto/dispatch-transfer.dto';
import { ReceiveTransferDto } from './dto/receive-transfer.dto';

export type StockTransferWithDetails = StockTransfer & {
  lines: StockTransferLine[];
};

@Injectable()
export class TransferService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists inter-store stock transfers scoped to the authenticated user's assigned stores/regions.
   */
  async findAll(
    dataScope?: StoreScopedFilter,
    status?: TransferStatus,
  ): Promise<StockTransfer[]> {
    const where: Prisma.StockTransferWhereInput = {
      ...(status ? { status } : {}),
    };

    if (dataScope) {
      const scopedStoreIds = dataScope.storeId?.in ?? dataScope.id?.in;
      const scopedRegionIds =
        dataScope.store?.regionId?.in ?? dataScope.regionId?.in;

      if (scopedStoreIds) {
        where.OR = [
          { fromStoreId: { in: scopedStoreIds } },
          { toStoreId: { in: scopedStoreIds } },
        ];
      } else if (scopedRegionIds) {
        where.OR = [
          { fromStore: { regionId: { in: scopedRegionIds } } },
          { toStore: { regionId: { in: scopedRegionIds } } },
        ];
      }
    }

    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        fromStore: true,
        toStore: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single `StockTransfer` by UUID with full store and line details.
   */
  async findById(id: string): Promise<StockTransfer> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromStore: true,
        toStore: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException(
        `StockTransfer with ID '${id}' was not found.`,
      );
    }

    return transfer;
  }

  /**
   * Step 1: Creates an inter-store stock transfer in `PENDING_APPROVAL` status
   * with unique `transferNumber` and line items.
   */
  async createTransfer(
    dto: CreateTransferDto,
    userId: string,
  ): Promise<StockTransferWithDetails> {
    if (dto.fromStoreId === dto.toStoreId) {
      throw new BadRequestException(
        'fromStoreId and toStoreId cannot be the same store.',
      );
    }

    const [fromStore, toStore] = await Promise.all([
      this.prisma.store.findUnique({ where: { id: dto.fromStoreId } }),
      this.prisma.store.findUnique({ where: { id: dto.toStoreId } }),
    ]);

    if (!fromStore || !fromStore.isActive) {
      throw new NotFoundException(
        `Active source store '${dto.fromStoreId}' was not found.`,
      );
    }

    if (!toStore || !toStore.isActive) {
      throw new NotFoundException(
        `Active destination store '${dto.toStoreId}' was not found.`,
      );
    }

    const suffix = `${Date.now().toString().slice(-6)}-${Math.floor(
      100 + Math.random() * 900,
    )}`;
    const transferNumber = `TRF-${suffix}`;

    return this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromStoreId: dto.fromStoreId,
        toStoreId: dto.toStoreId,
        status: TransferStatus.PENDING_APPROVAL,
        requestedBy: userId,
        lines: {
          create: dto.lines.map((line) => ({
            productId: line.productId,
            requestedQty: new Prisma.Decimal(line.requestedQty),
            approvedQty: new Prisma.Decimal(line.requestedQty),
          })),
        },
      },
      include: {
        lines: true,
      },
    });
  }

  /**
   * Step 2: Dispatches a `PENDING_APPROVAL` transfer into `APPROVED_IN_TRANSIT`:
   * - Validates source store has `availableQuantity >= line.requestedQty`.
   * - Atomically decrements `availableQuantity`, increments `inTransitQuantity`,
   *   and increments `version` by 1 (throwing `INV_CONCURRENCY_CONFLICT` on race).
   * - Records `InventoryMovement` with `movementType = 'TRANSFER_OUT_DISPATCH'`.
   * - Updates `StockTransfer` status to `APPROVED_IN_TRANSIT` with carrier/vehicle metadata.
   */
  async dispatchTransfer(
    transferId: string,
    dto: DispatchTransferDto,
    userId: string,
  ): Promise<StockTransferWithDetails> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { lines: true },
    });

    if (!transfer) {
      throw new NotFoundException(
        `StockTransfer with ID '${transferId}' was not found.`,
      );
    }

    if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot dispatch transfer in status '${transfer.status}'. Expected 'PENDING_APPROVAL'.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        const dispatchQty = line.approvedQty ?? line.requestedQty;

        const sourceInventory = await tx.inventory.findUnique({
          where: {
            storeId_productId: {
              storeId: transfer.fromStoreId,
              productId: line.productId,
            },
          },
        });

        if (
          !sourceInventory ||
          sourceInventory.availableQuantity.lessThan(dispatchQty)
        ) {
          throw new BadRequestException(
            `INV_INSUFFICIENT_STOCK: Insufficient stock at source store for product '${line.productId}'.`,
          );
        }

        const newAvailable =
          sourceInventory.availableQuantity.minus(dispatchQty);
        const newInTransit =
          sourceInventory.inTransitQuantity.plus(dispatchQty);

        const updateLock = await tx.inventory.updateMany({
          where: {
            id: sourceInventory.id,
            version: sourceInventory.version,
          },
          data: {
            availableQuantity: newAvailable,
            inTransitQuantity: newInTransit,
            version: { increment: 1 },
          },
        });

        if (updateLock.count === 0) {
          throw new ConflictException('INV_CONCURRENCY_CONFLICT');
        }

        await tx.inventoryMovement.create({
          data: {
            inventoryId: sourceInventory.id,
            movementType: MovementType.TRANSFER_OUT_DISPATCH,
            quantity: dispatchQty.negated(),
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            remarks: `Dispatched transfer ${transfer.transferNumber} to store ${transfer.toStoreId}`,
            createdBy: userId,
          },
        });

        if (!line.approvedQty) {
          await tx.stockTransferLine.update({
            where: { id: line.id },
            data: { approvedQty: dispatchQty },
          });
        }
      }

      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.APPROVED_IN_TRANSIT,
          carrierName: dto.carrierName ?? null,
          vehicleNumber: dto.vehicleNumber ?? null,
          dispatchNoteNumber: dto.dispatchNoteNumber ?? null,
          estimatedArrival: dto.estimatedArrival
            ? new Date(dto.estimatedArrival)
            : null,
          dispatchedAt: new Date(),
          approvedBy: userId,
        },
        include: {
          lines: true,
        },
      });
    });
  }

  /**
   * Step 3: Receives an `APPROVED_IN_TRANSIT` transfer into `RECEIVED`:
   * - Clears the full dispatched quantity (`approvedQty ?? requestedQty`) from source store's `inTransitQuantity`.
   * - Lazily initializes destination store `Inventory` row if missing.
   * - Credits `receivedQty` to destination store's `availableQuantity` with optimistic locking.
   * - Records `TRANSFER_IN_RECEIPT` movement on destination store.
   * - If `receivedQty < approvedQty` (Short-shipment or in-transit damage), automatically records
   *   the shortfall (`-(approvedQty - receivedQty)`) as `DAMAGED_WRITE_OFF`.
   */
  async receiveTransfer(
    transferId: string,
    dto: ReceiveTransferDto,
    userId: string,
  ): Promise<StockTransferWithDetails> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { lines: true },
    });

    if (!transfer) {
      throw new NotFoundException(
        `StockTransfer with ID '${transferId}' was not found.`,
      );
    }

    if (transfer.status !== TransferStatus.APPROVED_IN_TRANSIT) {
      throw new BadRequestException(
        `Cannot receive transfer in status '${transfer.status}'. Expected 'APPROVED_IN_TRANSIT'.`,
      );
    }

    const receivedMap = new Map<string, Prisma.Decimal>();
    for (const item of dto.lines) {
      receivedMap.set(item.productId, new Prisma.Decimal(item.receivedQty));
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        const expectedQty = line.approvedQty ?? line.requestedQty;
        const receivedQty = receivedMap.get(line.productId) ?? expectedQty;
        const zero = new Prisma.Decimal(0);

        if (receivedQty.lessThan(zero)) {
          throw new BadRequestException(
            `receivedQty cannot be negative for product '${line.productId}'.`,
          );
        }

        if (receivedQty.greaterThan(expectedQty)) {
          throw new BadRequestException(
            `receivedQty (${receivedQty.toFixed(3)}) cannot exceed dispatched quantity (${expectedQty.toFixed(3)}) for product '${line.productId}'.`,
          );
        }

        // 1. Clear full expectedQty from source store's inTransitQuantity
        const sourceInv = await tx.inventory.findUnique({
          where: {
            storeId_productId: {
              storeId: transfer.fromStoreId,
              productId: line.productId,
            },
          },
        });

        if (!sourceInv) {
          throw new NotFoundException(
            `Source inventory missing for store '${transfer.fromStoreId}' and product '${line.productId}'.`,
          );
        }

        const updatedSourceInTransit = Prisma.Decimal.max(
          zero,
          sourceInv.inTransitQuantity.minus(expectedQty),
        );

        const sourceLock = await tx.inventory.updateMany({
          where: {
            id: sourceInv.id,
            version: sourceInv.version,
          },
          data: {
            inTransitQuantity: updatedSourceInTransit,
            version: { increment: 1 },
          },
        });

        if (sourceLock.count === 0) {
          throw new ConflictException('INV_CONCURRENCY_CONFLICT');
        }

        // 2. Lazily get or initialize destination store Inventory row
        let destInv = await tx.inventory.findUnique({
          where: {
            storeId_productId: {
              storeId: transfer.toStoreId,
              productId: line.productId,
            },
          },
        });

        if (!destInv) {
          destInv = await tx.inventory.create({
            data: {
              storeId: transfer.toStoreId,
              productId: line.productId,
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

        // 3. Credit receivedQty to destination store availableQuantity with optimistic lock check
        const newDestAvailable = destInv.availableQuantity.plus(receivedQty);
        const destLock = await tx.inventory.updateMany({
          where: {
            id: destInv.id,
            version: destInv.version,
          },
          data: {
            availableQuantity: newDestAvailable,
            version: { increment: 1 },
          },
        });

        if (destLock.count === 0) {
          throw new ConflictException('INV_CONCURRENCY_CONFLICT');
        }

        // 4. Record inward receipt movement at destination store
        await tx.inventoryMovement.create({
          data: {
            inventoryId: destInv.id,
            movementType: MovementType.TRANSFER_IN_RECEIPT,
            quantity: receivedQty,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            remarks:
              dto.remarks ??
              `Received transfer ${transfer.transferNumber} from store ${transfer.fromStoreId}`,
            createdBy: userId,
          },
        });

        // 5. If receivedQty < expectedQty, record automatic DAMAGED_WRITE_OFF for shortfall
        if (receivedQty.lessThan(expectedQty)) {
          const shortfall = expectedQty.minus(receivedQty);
          await tx.inventoryMovement.create({
            data: {
              inventoryId: sourceInv.id,
              movementType: MovementType.DAMAGED_WRITE_OFF,
              quantity: shortfall.negated(),
              referenceType: 'STOCK_TRANSFER',
              referenceId: transfer.id,
              remarks:
                dto.remarks || 'In-transit shortfall/damage',
              createdBy: userId,
            },
          });
        }

        // 6. Update StockTransferLine.receivedQty
        await tx.stockTransferLine.update({
          where: { id: line.id },
          data: { receivedQty },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.RECEIVED,
          receivedAt: new Date(),
          receivedBy: userId,
        },
        include: {
          lines: true,
        },
      });
    });
  }

  /**
   * Cancels a `StockTransfer`:
   * - If `PENDING_APPROVAL`: transitions directly to `CANCELLED`.
   * - If `APPROVED_IN_TRANSIT`: reverses source store inventory (`inTransitQuantity` -> `availableQuantity`)
   *   and records `STOCK_ADJUSTMENT` before transitioning to `CANCELLED`.
   */
  async cancelTransfer(
    transferId: string,
    userId: string,
    reason: string,
  ): Promise<StockTransferWithDetails> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { lines: true },
    });

    if (!transfer) {
      throw new NotFoundException(
        `StockTransfer with ID '${transferId}' was not found.`,
      );
    }

    if (transfer.status === TransferStatus.PENDING_APPROVAL) {
      return this.prisma.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.CANCELLED,
        },
        include: { lines: true },
      });
    }

    if (transfer.status !== TransferStatus.APPROVED_IN_TRANSIT) {
      throw new BadRequestException(
        `Cannot cancel transfer in status '${transfer.status}'. Only 'PENDING_APPROVAL' or 'APPROVED_IN_TRANSIT' can be cancelled.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const zero = new Prisma.Decimal(0);

      for (const line of transfer.lines) {
        const dispatchedQty = line.approvedQty ?? line.requestedQty;

        const sourceInv = await tx.inventory.findUnique({
          where: {
            storeId_productId: {
              storeId: transfer.fromStoreId,
              productId: line.productId,
            },
          },
        });

        if (!sourceInv) {
          throw new NotFoundException(
            `Source inventory not found for store '${transfer.fromStoreId}' and product '${line.productId}'.`,
          );
        }

        const reversedInTransit = Prisma.Decimal.max(
          zero,
          sourceInv.inTransitQuantity.minus(dispatchedQty),
        );
        const restoredAvailable =
          sourceInv.availableQuantity.plus(dispatchedQty);

        const lockResult = await tx.inventory.updateMany({
          where: {
            id: sourceInv.id,
            version: sourceInv.version,
          },
          data: {
            availableQuantity: restoredAvailable,
            inTransitQuantity: reversedInTransit,
            version: { increment: 1 },
          },
        });

        if (lockResult.count === 0) {
          throw new ConflictException('INV_CONCURRENCY_CONFLICT');
        }

        await tx.inventoryMovement.create({
          data: {
            inventoryId: sourceInv.id,
            movementType: MovementType.STOCK_ADJUSTMENT,
            quantity: dispatchedQty,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transfer.id,
            remarks: `Reversed in-transit stock on transfer cancellation (${transfer.transferNumber}): ${reason}`,
            createdBy: userId,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.CANCELLED,
        },
        include: { lines: true },
      });
    });
  }
}
