import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../auth";
import { prisma } from "../db";
import { NotFoundError, ForbiddenError } from "../utils/errors";

const router = Router();

router.use(authenticateToken);

// Helper to format store with storeFormat
function formatStore(s: any) {
  return {
    ...s,
    storeFormat: s.storeType?.code || "SUPERMARKET",
  };
}

// GET /api/v1/stores/network-directory
// Accessible to all authenticated users including STORE_MANAGER for peer directory lookups
router.get("/network-directory", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stores = await storage.getStores();
    const directory = stores.map((s) => ({
      id: s.id,
      storeCode: s.storeCode,
      name: s.name,
      regionId: s.regionId,
      region: s.region,
      storeTypeId: s.storeTypeId,
      storeFormat: s.storeType?.code || "SUPERMARKET",
      city: s.city,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      openingDate: s.openingDate,
      isActive: s.isActive,
    }));

    res.json({
      success: true,
      data: directory,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/stores
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regionId = req.query.regionId as string | undefined;
    const isActiveQuery =
      req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
    const isAdminOrExec =
      req.user?.role === "ADMIN" || req.user?.role === "EXECUTIVE";
    const effectiveIsActive =
      isActiveQuery !== undefined ? isActiveQuery : (isAdminOrExec ? undefined : true);

    let stores = await storage.getStores({
      regionId,
      isActive: effectiveIsActive,
    });

    // Enforce data scope for STORE_MANAGER and REGIONAL_MANAGER
    if (req.user?.role === "STORE_MANAGER") {
      stores = stores.filter((s) => req.user!.assignedStoreIds.includes(s.id));
    } else if (req.user?.role === "REGIONAL_MANAGER") {
      stores = stores.filter((s) => req.user!.assignedRegionIds.includes(s.regionId));
    }

    res.json({
      success: true,
      data: stores.map(formatStore),
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/stores/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await storage.getStore(req.params.id);
    if (!store) throw new NotFoundError("Store not found");

    res.json({
      success: true,
      data: formatStore(store),
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/stores (Admin only)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== "ADMIN" && req.user?.role !== "EXECUTIVE") {
      throw new ForbiddenError("Only Administrators can onboard stores");
    }

    const {
      storeCode,
      name,
      regionId,
      storeTypeId,
      city,
      address,
      openingDate,
      latitude,
      longitude,
      isActive,
    } = req.body;

    // Resolve storeTypeId: If code like "HYPERMARKET", find StoreType record
    let resolvedStoreTypeId = storeTypeId;
    const storeTypeMatch = await prisma.storeType.findFirst({
      where: { OR: [{ id: storeTypeId }, { code: storeTypeId }] },
    });
    if (storeTypeMatch) {
      resolvedStoreTypeId = storeTypeMatch.id;
    }

    const created = await prisma.store.create({
      data: {
        storeCode: storeCode.toUpperCase(),
        name,
        regionId,
        storeTypeId: resolvedStoreTypeId,
        city,
        address: address || null,
        openingDate: new Date(openingDate || Date.now()),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: { region: true, storeType: true },
    });

    res.status(201).json({
      success: true,
      data: formatStore(created),
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/stores/:id (Admin only)
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== "ADMIN" && req.user?.role !== "EXECUTIVE") {
      throw new ForbiddenError("Only Administrators can edit stores");
    }

    const {
      storeCode,
      name,
      regionId,
      storeTypeId,
      city,
      address,
      openingDate,
      latitude,
      longitude,
      isActive,
    } = req.body;

    let resolvedStoreTypeId = storeTypeId;
    if (storeTypeId) {
      const storeTypeMatch = await prisma.storeType.findFirst({
        where: { OR: [{ id: storeTypeId }, { code: storeTypeId }] },
      });
      if (storeTypeMatch) {
        resolvedStoreTypeId = storeTypeMatch.id;
      }
    }

    const updated = await prisma.store.update({
      where: { id: req.params.id },
      data: {
        ...(storeCode ? { storeCode: storeCode.toUpperCase() } : {}),
        ...(name ? { name } : {}),
        ...(regionId ? { regionId } : {}),
        ...(resolvedStoreTypeId ? { storeTypeId: resolvedStoreTypeId } : {}),
        ...(city ? { city } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(openingDate ? { openingDate: new Date(openingDate) } : {}),
        ...(latitude !== undefined ? { latitude: latitude ? Number(latitude) : null } : {}),
        ...(longitude !== undefined ? { longitude: longitude ? Number(longitude) : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: { region: true, storeType: true },
    });

    res.json({
      success: true,
      data: formatStore(updated),
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
