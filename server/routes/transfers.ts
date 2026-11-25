import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { storage } from "../storage";
import { authenticateToken } from "../auth";
import { createTransferSchema } from "../../shared/schema";
import { ForbiddenError, NotFoundError, BadRequestError } from "../utils/errors";
import { buildDateFilter } from "../utils/field-mapping";
import { Prisma } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/transfers
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const requestedStoreId = req.query.storeId as string | undefined;
    const regionIdParam = req.query.regionId as string | undefined;
    const statusParam = req.query.status as string | undefined;
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;
    const searchParam = req.query.search as string | undefined;

    const where: Prisma.StockTransferWhereInput = {};

    // 1. Data Scoping by User Role & Cascading Filters
    if (user.role === "STORE_MANAGER") {
      // Store Manager can only see transfers involving their assigned store
      if (requestedStoreId && requestedStoreId !== "ALL" && !user.assignedStoreIds.includes(requestedStoreId)) {
        throw new ForbiddenError(
          "Store Managers are not authorized to view transfers for unassigned stores.",
        );
      }
      where.OR = [
        { fromStoreId: { in: user.assignedStoreIds } },
        { toStoreId: { in: user.assignedStoreIds } },
      ];
    } else if (user.role === "REGIONAL_MANAGER") {
      // Regional Manager can view transfers for stores within their assigned region
      if (requestedStoreId && requestedStoreId !== "ALL") {
        where.OR = [
          { fromStoreId: requestedStoreId },
          { toStoreId: requestedStoreId },
        ];
      } else {
        where.OR = [
          { fromStore: { regionId: { in: user.assignedRegionIds } } },
          { toStore: { regionId: { in: user.assignedRegionIds } } },
        ];
      }
    } else {
      // ADMIN & EXECUTIVE: Global access with cascading Region -> Store filter
      if (requestedStoreId && requestedStoreId !== "ALL") {
        where.OR = [
          { fromStoreId: requestedStoreId },
          { toStoreId: requestedStoreId },
        ];
      } else if (regionIdParam && regionIdParam !== "ALL") {
        where.OR = [
          { fromStore: { regionId: regionIdParam } },
          { toStore: { regionId: regionIdParam } },
        ];
      }
    }

    // 2. Status Filtering
    if (statusParam === "INCOMING" || statusParam === "APPROVED_IN_TRANSIT") {
      where.status = { in: ["APPROVED_IN_TRANSIT", "DISPATCHED", "PENDING_APPROVAL"] };
    } else if (statusParam === "COMPLETED") {
      where.status = { in: ["COMPLETED", "RECEIVED"] };
    } else if (statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }

    // 3. Date Range Filtering
    const dateFilter = buildDateFilter(startDateParam, endDateParam);
    if (dateFilter) {
      if (statusParam === "COMPLETED") {
        where.receivedAt = dateFilter;
      } else {
        where.createdAt = dateFilter;
      }
    }

    // 4. Keyword Search
    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      const searchConditions: Prisma.StockTransferWhereInput[] = [
        { transferNumber: { contains: q } },
        { carrierName: { contains: q } },
        { vehicleNumber: { contains: q } },
        { fromStore: { storeCode: { contains: q } } },
        { toStore: { storeCode: { contains: q } } },
        { lines: { some: { product: { sku: { contains: q } } } } },
        { lines: { some: { product: { name: { contains: q } } } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // 5. Pagination & Query
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [total, transfers] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // 6. Batch Fetch Movement Damage Details and User Names for Completed Transfers
    const completedTransferNumbers = transfers
      .filter((t) => t.status === "COMPLETED" || t.status === "RECEIVED")
      .map((t) => t.transferNumber);

    const receiverUserIds = transfers
      .map((t) => t.receivedBy)
      .filter((id): id is string => Boolean(id));

    const [damageMovements, receiverUsers] = await Promise.all([
      completedTransferNumbers.length > 0
        ? prisma.inventoryMovement.findMany({
            where: {
              referenceId: { in: completedTransferNumbers },
              movementType: "DAMAGED_WRITE_OFF",
            },
            include: {
              inventory: { select: { productId: true } },
            },
          })
        : [],
      receiverUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: receiverUserIds } },
            select: { id: true, fullName: true, role: true },
          })
        : [],
    ]);

    const userMap = new Map(receiverUsers.map((u) => [u.id, `${u.fullName} (${u.role})`]));
    const damageReasonMap = new Map<string, string>();
    for (const dm of damageMovements) {
      if (dm.inventory?.productId && dm.referenceId) {
        damageReasonMap.set(`${dm.referenceId}::${dm.inventory.productId}`, dm.remarks || "Damaged in transit");
      }
    }

    // 7. Map to TransferShipmentRecord Contract with Scrapped / Damage Details
    const items = transfers.map((trf) => {
      const receivedByName = trf.receivedBy
        ? userMap.get(trf.receivedBy) || trf.receivedBy
        : null;

      return {
        id: trf.id,
        transferNumber: trf.transferNumber,
        sourceStoreId: trf.fromStoreId,
        sourceStoreCode: trf.fromStore?.storeCode || "WH-001",
        sourceStoreName: trf.fromStore?.name || "Logistics Hub",
        destinationStoreId: trf.toStoreId,
        destinationStoreCode: trf.toStore?.storeCode || "WH-002",
        destinationStoreName: trf.toStore?.name || "Destination Store",
        status: (trf.status === "RECEIVED" ? "COMPLETED" : trf.status) as any,
        shippedDate: (trf.dispatchedAt || trf.createdAt).toISOString(),
        completedDate: trf.receivedAt?.toISOString() || null,
        receivedByName,
        carrierName: trf.carrierName || "Delhivery Logistics",
        vehicleNumber: trf.vehicleNumber || "MP-09-TR-7821",
        driverPhone: null,
        lines: trf.lines.map((line) => {
          const shippedQty = Number(line.approvedQty || line.requestedQty);
          const receivedQty = line.receivedQty != null ? Number(line.receivedQty) : null;
          const shortfallQty =
            receivedQty != null && shippedQty > receivedQty
              ? Number((shippedQty - receivedQty).toFixed(3))
              : 0;

          const specificReason = damageReasonMap.get(`${trf.transferNumber}::${line.productId}`) ||
            (shortfallQty > 0 ? "Damaged / Shortfall recorded during dock receiving" : undefined);

          return {
            id: line.id,
            productId: line.productId,
            sku: line.product?.sku || "SKU-UNKNOWN",
            productCode: line.product?.productCode || line.productId,
            productName: line.product?.name || "Transferred Product",
            unitOfMeasure: (line.product?.unitOfMeasure || "PIECE") as any,
            requestedQty: Number(line.requestedQty),
            shippedQty,
            receivedQty,
            shortfallQty,
            shortfallReason: specificReason,
          };
        }),
      };
    });

    res.json({
      success: true,
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transfers/:id/receive
router.post("/:id/receive", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const transferId = req.params.id;

    // Role Guard: Only STORE_MANAGER and ADMIN can receive physical goods on the dock
    if (user.role !== "STORE_MANAGER" && user.role !== "ADMIN") {
      throw new ForbiddenError(
        "Only the receiving Store Manager or a Platform Admin is authorized to confirm dock receipts.",
      );
    }

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        lines: true,
        toStore: true,
        fromStore: true,
      },
    });

    if (!transfer) {
      throw new NotFoundError(`StockTransfer with ID '${transferId}' was not found.`);
    }

    // Store Custody Guard: If STORE_MANAGER, destination store must be in user's assignedStoreIds
    if (user.role === "STORE_MANAGER") {
      if (!user.assignedStoreIds.includes(transfer.toStoreId)) {
        throw new ForbiddenError(
          `Unauthorized: You can only confirm receipt for shipments destined to your assigned store (${user.assignedStoreIds.join(", ")}).`,
        );
      }
    }

    // Status Guard
    if (transfer.status === "COMPLETED" || transfer.status === "RECEIVED") {
      throw new BadRequestError(
        `Transfer ${transfer.transferNumber} has already been received and finalized.`,
      );
    }

    const { lines = [], remarks } = req.body;
    const receivedMap = new Map<string, number>();
    const reasonMap = new Map<string, string>();

    for (const item of lines) {
      if (item.productId && typeof item.receivedQty === "number") {
        receivedMap.set(item.productId, item.receivedQty);
      }
      if (item.productId && item.shortfallReason) {
        reasonMap.set(item.productId, item.shortfallReason);
      }
    }

    // Execute atomic double-entry ledger update in a Prisma transaction
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        const expectedQty = Number(line.approvedQty || line.requestedQty || 0);
        const receivedQty = receivedMap.has(line.productId)
          ? receivedMap.get(line.productId)!
          : expectedQty;

        if (receivedQty < 0) {
          throw new BadRequestError(`Received quantity cannot be negative for product '${line.productId}'.`);
        }
        if (receivedQty > expectedQty) {
          throw new BadRequestError(
            `Received quantity (${receivedQty}) cannot exceed dispatched quantity (${expectedQty}) for product '${line.productId}'.`,
          );
        }

        // 1. Decrement source store inTransitQuantity
        const sourceInv = await tx.inventory.findUnique({
          where: {
            storeId_productId: {
              storeId: transfer.fromStoreId,
              productId: line.productId,
            },
          },
        });
        if (sourceInv) {
          const newInTransit = Math.max(0, Number(sourceInv.inTransitQuantity) - expectedQty);
          await tx.inventory.update({
            where: { id: sourceInv.id },
            data: {
              inTransitQuantity: newInTransit,
              version: { increment: 1 },
            },
          });
        }

        // 2. Increment destination store availableQuantity (lazily create if missing)
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
              availableQuantity: receivedQty,
              reservedQuantity: 0,
              inTransitQuantity: 0,
              minimumStock: 10,
              maximumStock: 80,
              reorderLevel: 20,
              version: 1,
            },
          });
        } else {
          await tx.inventory.update({
            where: { id: destInv.id },
            data: {
              availableQuantity: { increment: receivedQty },
              version: { increment: 1 },
            },
          });
        }

        // 3. Record InventoryMovement: TRANSFER_IN_RECEIPT
        await tx.inventoryMovement.create({
          data: {
            inventoryId: destInv.id,
            movementType: "TRANSFER_IN_RECEIPT",
            quantity: receivedQty,
            referenceType: "STOCK_TRANSFER",
            referenceId: transfer.transferNumber,
            remarks: remarks || `Dock inward receipt for ${transfer.transferNumber}`,
            createdBy: user.id,
          },
        });

        // 4. If receivedQty < expectedQty, record DAMAGED_WRITE_OFF
        const shortfall = expectedQty - receivedQty;
        if (shortfall > 0) {
          const reason = reasonMap.get(line.productId) || "In-transit damage or shortfall";
          await tx.inventoryMovement.create({
            data: {
              inventoryId: destInv.id,
              movementType: "DAMAGED_WRITE_OFF",
              quantity: -shortfall,
              referenceType: "STOCK_TRANSFER",
              referenceId: transfer.transferNumber,
              remarks: `${reason} (${shortfall.toFixed(3)} units)`,
              createdBy: user.id,
            },
          });
        }

        // 5. Update StockTransferLine with receivedQty
        await tx.stockTransferLine.update({
          where: { id: line.id },
          data: { receivedQty },
        });
      }

      // 6. Update StockTransfer status to COMPLETED
      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "COMPLETED",
          receivedAt: new Date(),
          receivedBy: user.id,
        },
        include: {
          fromStore: true,
          toStore: true,
          lines: { include: { product: true } },
        },
      });
    });

    res.json({
      success: true,
      data: {
        id: updatedTransfer.id,
        transferNumber: updatedTransfer.transferNumber,
        status: updatedTransfer.status,
        receivedAt: updatedTransfer.receivedAt,
        message: `Successfully received transfer ${updatedTransfer.transferNumber} at destination dock.`,
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transfers
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = createTransferSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const { fromStoreId, toStoreId, productId, requestedQuantity, remarks } = parseResult.data;

    const transfer = await storage.createTransfer({
      fromStoreId,
      toStoreId,
      productId,
      requestedQty: requestedQuantity,
      userId: req.user!.id,
      remarks,
    });

    res.status(201).json({
      success: true,
      data: transfer,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/transfers/:id/status
router.patch("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const updated = await storage.updateTransferStatus(req.params.id, status, req.user!.id);

    res.json({
      success: true,
      data: updated,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
