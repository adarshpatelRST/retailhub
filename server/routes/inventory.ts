import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { storage } from "../storage";
import { authenticateToken } from "../auth";
import { requireRole } from "../middleware/rbac";
import { dataScopeMiddleware } from "../middleware/session";
import { velocityService } from "../services/velocity-service";
import { doiService } from "../services/doi-service";
import { serializeDecimal } from "../utils/field-mapping";
import { stockAdjustmentSchema } from "../../shared/schema";

const router = Router();

router.use(authenticateToken);
router.use(dataScopeMiddleware);

// Helper: Safely resolve raw storeId, storeCode, or demo slug (e.g. store-bpl-001) to database Store
async function resolveStoreRecord(rawId?: string) {
  if (!rawId || rawId === "ALL") return null;
  const clean = rawId.trim();

  try {
    // 1. Try finding by ID
    let store = await prisma.store.findUnique({
      where: { id: clean },
      select: { id: true, storeCode: true, name: true, city: true },
    });
    if (store) return store;
  } catch {
    // ID might not be a valid UUID format, continue to fallback search
  }

  // 2. Try finding by exact storeCode
  let store = await prisma.store.findFirst({
    where: { storeCode: clean.toUpperCase() },
    select: { id: true, storeCode: true, name: true, city: true },
  });
  if (store) return store;

  // 3. Try parsing slug like store-bpl-001 -> BPL-001
  const codeMatch = clean.match(/(?:store-)?([a-zA-Z]{3}-\d{2,3})/i);
  if (codeMatch) {
    store = await prisma.store.findFirst({
      where: { storeCode: { contains: codeMatch[1].toUpperCase() } },
      select: { id: true, storeCode: true, name: true, city: true },
    });
    if (store) return store;
  }

  // 4. Try case-insensitive contains search
  store = await prisma.store.findFirst({
    where: {
      OR: [
        { storeCode: { contains: clean } },
        { name: { contains: clean } },
        { city: { contains: clean } },
      ],
    },
    select: { id: true, storeCode: true, name: true, city: true },
  });
  return store;
}

// GET /api/v1/inventory
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const requestedStoreId = req.query.storeId as string | undefined;
    const searchParam = (req.query.search as string)?.trim();

    let targetStore: any = null;

    if (user.role === "STORE_MANAGER") {
      const smStoreId = user.assignedStoreIds[0] || requestedStoreId || "BPL-001";
      targetStore = await resolveStoreRecord(smStoreId);
    } else if (requestedStoreId && requestedStoreId !== "ALL") {
      targetStore = await resolveStoreRecord(requestedStoreId);
    }

    const where: any = {};
    if (targetStore) {
      where.storeId = targetStore.id;

      // Lazy initialize inventory balances if selected store has no records
      try {
        const existingCount = await prisma.inventory.count({ where: { storeId: targetStore.id } });
        if (existingCount === 0) {
          const sampleProds = await prisma.product.findMany({
            take: 60,
            where: { isActive: true },
          });

          if (sampleProds.length > 0) {
            const rows = sampleProds.map((prod, idx) => {
              const modVal = (idx + (prod.sku.charCodeAt(prod.sku.length - 1) || 0)) % 10;
              let availableQuantity = 42;
              if (modVal === 0) availableQuantity = 2; // CRITICAL
              else if (modVal === 1 || modVal === 2) availableQuantity = 8; // LOW
              else if (modVal === 9) availableQuantity = 120; // EXCESS

              return {
                storeId: targetStore.id,
                productId: prod.id,
                availableQuantity,
                reservedQuantity: 0,
                inTransitQuantity: 0,
                minimumStock: 10,
                maximumStock: 80,
                reorderLevel: 20,
                version: 1,
              };
            });

            await prisma.inventory.createMany({ data: rows });
          }
        }
      } catch (initErr) {
        // Log but do not block request if lazy initialization encounters any conflict
        console.warn("[inventory] Lazy balance initialization skipped:", initErr);
      }
    } else if (requestedStoreId && requestedStoreId !== "ALL") {
      where.storeId = requestedStoreId;
    } else if (user.role === "REGIONAL_MANAGER") {
      const regStores = await prisma.store.findMany({
        where: { regionId: { in: user.assignedRegionIds }, isActive: true },
        select: { id: true },
      });
      where.storeId = { in: regStores.map((s) => s.id) };
    }

    // Database-level search across SKU, Barcode, Product Name, Store Code, and Store Name
    if (searchParam) {
      const searchConditions = [
        { product: { sku: { contains: searchParam } } },
        { product: { name: { contains: searchParam } } },
        { product: { productCode: { contains: searchParam } } },
        { store: { name: { contains: searchParam } } },
        { store: { storeCode: { contains: searchParam } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 400));
    const balances = await prisma.inventory.findMany({
      where,
      include: {
        store: { select: { id: true, storeCode: true, name: true, city: true } },
        product: {
          select: {
            id: true,
            sku: true,
            productCode: true,
            name: true,
            unitOfMeasure: true,
            costPrice: true,
            sellingPrice: true,
            mrp: true,
            category: { select: { id: true, name: true, code: true } },
            brand: { select: { id: true, name: true, code: true } },
          },
        },
      },
      take: limit,
      orderBy: { lastUpdatedOn: "desc" },
    });

    const enriched = await Promise.all(
      balances.map(async (inv) => {
        const availableStock = serializeDecimal(inv.availableQuantity);
        const reservedQuantity = serializeDecimal(inv.reservedQuantity);
        const inTransitQuantity = serializeDecimal(inv.inTransitQuantity);
        const minimumStock = serializeDecimal(inv.minimumStock);
        const maximumStock = serializeDecimal(inv.maximumStock);
        const reorderLevel = serializeDecimal(inv.reorderLevel);

        const costPrice = Number(inv.product?.costPrice) || 0;
        const sellingPrice = Number(inv.product?.sellingPrice) || 0;
        const mrp = Number(inv.product?.mrp) || 0;

        const rollingAds = await velocityService.computeRollingAds(inv.storeId, inv.productId, 7);
        const doi = doiService.calculateDoi(availableStock, rollingAds);
        const status = doiService.classifyStatus(doi);

        let riskTier: "HIGH" | "MEDIUM" | "LOW" = "LOW";
        if (doi <= 3.0) riskTier = "HIGH";
        else if (doi <= 7.0) riskTier = "MEDIUM";

        return {
          id: inv.id,
          storeId: inv.storeId,
          storeCode: inv.store?.storeCode || "",
          storeName: inv.store?.name || "",
          productId: inv.productId,
          sku: inv.product?.sku || "",
          productCode: inv.product?.productCode || "",
          productName: inv.product?.name || "",
          unitOfMeasure: (inv.product?.unitOfMeasure as any) || "PIECE",
          costPrice,
          sellingPrice,
          mrp,
          availableQuantity: availableStock,
          reservedQuantity,
          inTransitQuantity,
          minimumStock,
          maximumStock,
          reorderLevel,
          averageDailySales: rollingAds,
          daysOfInventory: doi,
          status,
          riskTier,
          version: inv.version,
          lastUpdatedOn: inv.lastUpdatedOn instanceof Date ? inv.lastUpdatedOn.toISOString() : String(inv.lastUpdatedOn),
          // Backwards-compatible aliases
          rollingAds,
          doi,
          healthStatus: status,
          barcode: inv.product?.productCode || "",
          categoryName: inv.product?.category?.name || "General",
          // Report module compatibility aliases
          availableQty: availableStock,
          inTransitQty: inTransitQuantity,
          ads: rollingAds,
          currentDOI: doi,
          stockStatus: status,
        };
      }),
    );

    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === "desc" ? "desc" : "asc";

    if (sortBy) {
      enriched.sort((a: any, b: any) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        valA = String(valA ?? "").toLowerCase();
        valB = String(valB ?? "").toLowerCase();
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    res.json({
      success: true,
      data: {
        items: enriched,
        meta: {
          page: 1,
          limit: enriched.length,
          total: enriched.length,
          totalPages: 1,
        },
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/inventory/adjust
router.post("/adjust", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body || {};
    const normalizedBody = {
      storeId: raw.storeId,
      productId: raw.productId,
      adjustmentQuantity: Number(raw.adjustmentQuantity ?? raw.quantityDelta),
      reason: String(raw.reason ?? raw.remarks ?? "Manual Cycle Count Adjustment").trim(),
      currentVersion: raw.currentVersion ?? raw.expectedVersion ?? undefined,
    };

    const parseResult = stockAdjustmentSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const { storeId, productId, adjustmentQuantity, reason, currentVersion } = parseResult.data;

    const updated = await storage.adjustStock({
      storeId,
      productId,
      adjustmentQty: adjustmentQuantity,
      reason,
      currentVersion: currentVersion ?? 1,
      userId: req.user!.id,
    });

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

/**
 * POST /api/v1/inventory/bulk-deplete
 * Sets availableQuantity = 0.000 for all products in the selected store or region (Test Utility)
 */
router.post("/bulk-deplete", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { regionId, storeId } = req.body || {};

    let targetStoreIds: string[] = [];
    let targetDescription = "";

    if (storeId && storeId !== "ALL") {
      const store = await resolveStoreRecord(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          error: { code: "STORE_NOT_FOUND", message: `Store '${storeId}' was not found.` },
        });
      }
      targetStoreIds = [store.id];
      targetDescription = `${store.name} (${store.storeCode})`;
    } else if (regionId && regionId !== "ALL") {
      const stores = await prisma.store.findMany({
        where: { regionId, isActive: true },
        select: { id: true, name: true, storeCode: true, region: { select: { name: true } } },
      });
      if (stores.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "REGION_EMPTY", message: "No active stores found in the selected region." },
        });
      }
      targetStoreIds = stores.map((s) => s.id);
      targetDescription = `All ${stores.length} store(s) in ${stores[0].region?.name || "Region"}`;
    } else {
      const allStores = await prisma.store.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      targetStoreIds = allStores.map((s) => s.id);
      targetDescription = `All ${targetStoreIds.length} store(s) across the entire network`;
    }

    const updateResult = await prisma.inventory.updateMany({
      where: { storeId: { in: targetStoreIds } },
      data: {
        availableQuantity: 0.000,
        reorderLevel: 15.000,
        lastUpdatedOn: new Date(),
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          correlationId: req.correlationId || `stockout-${Date.now()}`,
          userId: (req as any).user?.id || null,
          action: "SIMULATE_BULK_STOCKOUT",
          entityName: "Inventory",
          entityId: storeId || regionId || "ALL",
          oldValues: JSON.stringify({ targetDescription, affectedStores: targetStoreIds.length }),
          newValues: JSON.stringify({ availableQuantity: 0.0, depletedRecordsCount: updateResult.count }),
          ipAddress: req.ip || "127.0.0.1",
          timestamp: new Date(),
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log for bulk stockout:", auditErr);
    }

    res.json({
      success: true,
      data: {
        affectedStoresCount: targetStoreIds.length,
        depletedRecordsCount: updateResult.count,
        targetDescription,
      },
      message: `Stock depleted to 0.000 for ${updateResult.count} products across ${targetDescription}.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/inventory/restore-baseline
 * Restores healthy inventory level (45.000) for all products in the selected store or region (Test Utility)
 */
router.post("/restore-baseline", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { regionId, storeId } = req.body || {};

    let targetStoreIds: string[] = [];
    let targetDescription = "";

    if (storeId && storeId !== "ALL") {
      const store = await resolveStoreRecord(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          error: { code: "STORE_NOT_FOUND", message: `Store '${storeId}' was not found.` },
        });
      }
      targetStoreIds = [store.id];
      targetDescription = `${store.name} (${store.storeCode})`;
    } else if (regionId && regionId !== "ALL") {
      const stores = await prisma.store.findMany({
        where: { regionId, isActive: true },
        select: { id: true, name: true, storeCode: true, region: { select: { name: true } } },
      });
      if (stores.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "REGION_EMPTY", message: "No active stores found in the selected region." },
        });
      }
      targetStoreIds = stores.map((s) => s.id);
      targetDescription = `All ${stores.length} store(s) in ${stores[0].region?.name || "Region"}`;
    } else {
      const allStores = await prisma.store.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      targetStoreIds = allStores.map((s) => s.id);
      targetDescription = `All ${targetStoreIds.length} store(s) across the entire network`;
    }

    const updateResult = await prisma.inventory.updateMany({
      where: { storeId: { in: targetStoreIds } },
      data: {
        availableQuantity: 45.000,
        reorderLevel: 15.000,
        lastUpdatedOn: new Date(),
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          correlationId: req.correlationId || `restore-${Date.now()}`,
          userId: (req as any).user?.id || null,
          action: "RESTORE_INVENTORY_BASELINE",
          entityName: "Inventory",
          entityId: storeId || regionId || "ALL",
          oldValues: JSON.stringify({ targetDescription, affectedStores: targetStoreIds.length }),
          newValues: JSON.stringify({ availableQuantity: 45.0, restoredRecordsCount: updateResult.count }),
          ipAddress: req.ip || "127.0.0.1",
          timestamp: new Date(),
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log for baseline restore:", auditErr);
    }

    res.json({
      success: true,
      data: {
        affectedStoresCount: targetStoreIds.length,
        restoredRecordsCount: updateResult.count,
        targetDescription,
      },
      message: `Baseline stock (45 units) restored for ${updateResult.count} products across ${targetDescription}.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
