import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken } from "../auth";
import { prisma } from "../db";
import { buildDateFilter } from "../utils/field-mapping";

const router = Router();
router.use(authenticateToken);

// Helper to check if a JSON string matches a storeId or regionId
function matchesStoreOrRegion(
  payloadStr: string | null,
  storeId?: string,
  storeCode?: string,
  regionId?: string,
): boolean {
  if (!payloadStr) return false;
  if (storeId && payloadStr.includes(storeId)) return true;
  if (storeCode && payloadStr.includes(storeCode)) return true;
  if (regionId && payloadStr.includes(regionId)) return true;
  return false;
}

// GET /api/v1/audit
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const search = (req.query.search as string)?.trim().toLowerCase() || "";
    const action = req.query.action as string | undefined;
    const regionId = req.query.regionId as string | undefined;
    const storeId = req.query.storeId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // RBAC Scope
    const isGlobal = user.role === "ADMIN" || user.role === "EXECUTIVE";
    const isRegional = user.role === "REGIONAL_MANAGER";
    const isStoreManager = user.role === "STORE_MANAGER";

    const assignedStoreIds: string[] = user.assignedStoreIds || [];
    const assignedRegionIds: string[] = user.assignedRegionIds || [];

    // 1. Fetch user map for display names and assignments
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        storeAssignments: { select: { storeId: true } },
        regionAssignments: { select: { regionId: true } },
      },
    });
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // 2. Fetch store map and region map for scoping
    const allStores = await prisma.store.findMany({
      select: { id: true, storeCode: true, name: true, regionId: true },
    });
    const storeMap = new Map(allStores.map((s) => [s.id, s]));

    const regionalStores = allStores.filter((s) => assignedRegionIds.includes(s.regionId));
    const regionalStoreIds = regionalStores.map((s) => s.id);

    // Date range filter
    const dateFilter = buildDateFilter(startDate, endDate);
    const where: any = {};
    if (dateFilter) {
      where.timestamp = dateFilter;
    }
    if (action && action !== "ALL") {
      const legacyActionMap: Record<string, string[]> = {
        CREATE_CATEGORY: ["CREATE_CATEGORY", "POST /api/v1/categories"],
        UPDATE_CATEGORY: ["UPDATE_CATEGORY", "PUT /api/v1/categories", "PATCH /api/v1/categories"],
        SOFT_DELETE_CATEGORY: ["SOFT_DELETE_CATEGORY", "DELETE /api/v1/categories"],
        CREATE_BRAND: ["CREATE_BRAND", "POST /api/v1/brands"],
        UPDATE_BRAND: ["UPDATE_BRAND", "PUT /api/v1/brands", "PATCH /api/v1/brands"],
        SOFT_DELETE_BRAND: ["SOFT_DELETE_BRAND", "DELETE /api/v1/brands"],
        UPDATE_USER_STATUS: ["UPDATE_USER_STATUS", "PATCH /api/v1/users"],
        UPDATE_USER: ["UPDATE_USER", "PUT /api/v1/users", "PATCH /api/v1/users"],
        RESET_EMPLOYEE_PASSWORD: ["RESET_EMPLOYEE_PASSWORD", "POST /api/v1/users"],
        CHANGE_PASSWORD: ["CHANGE_PASSWORD", "POST /api/v1/auth/change-password"],
      };

      const matches = legacyActionMap[action];
      if (matches) {
        where.action = { in: matches };
      } else {
        where.action = action;
      }
    }

    // Fetch candidate logs ordered by timestamp desc
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 500, // inspect recent batch for scope & in-memory matching
    });

    // Transform and filter according to RBAC & parameters
    let filtered = logs.map((log) => {
      const actor = log.userId ? userMap.get(log.userId) : null;
      let parsedOld: any = null;
      let parsedNew: any = null;
      try {
        if (log.oldValues) parsedOld = JSON.parse(log.oldValues);
      } catch {}
      try {
        if (log.newValues) parsedNew = JSON.parse(log.newValues);
      } catch {}

      let logStoreId =
        parsedNew?.storeId ||
        parsedOld?.storeId ||
        parsedNew?.sourceStoreId ||
        parsedOld?.sourceStoreId ||
        parsedNew?.destinationStoreId ||
        parsedOld?.destinationStoreId ||
        (log.entityName === "stores" || log.entityName === "Store" ? log.entityId : null);

      if (!logStoreId && actor?.storeAssignments?.length) {
        logStoreId = actor.storeAssignments[0].storeId;
      }

      const storeObj = logStoreId ? storeMap.get(logStoreId) : null;
      const logRegionId =
        storeObj?.regionId ||
        parsedNew?.regionId ||
        parsedOld?.regionId ||
        actor?.regionAssignments?.[0]?.regionId ||
        null;

      let normalizedEntityName = log.entityName;
      if (!normalizedEntityName || normalizedEntityName === "v1" || normalizedEntityName === "Resource") {
        const act = (log.action || "").toUpperCase();
        if (act.includes("CATEGORY") || act.includes("/CATEGORIES")) normalizedEntityName = "Category";
        else if (act.includes("BRAND") || act.includes("/BRANDS")) normalizedEntityName = "Brand";
        else if (act.includes("USER") || act.includes("/USERS") || act.includes("PASSWORD")) normalizedEntityName = "User";
        else if (act.includes("PRODUCT") || act.includes("/PRODUCTS") || act.includes("SKU")) normalizedEntityName = "Product";
        else if (act.includes("TRANSFER") || act.includes("/TRANSFERS")) normalizedEntityName = "StockTransfer";
        else if (act.includes("INVENTORY") || act.includes("STOCK") || act.includes("/INVENTORY")) normalizedEntityName = "Inventory";
        else if (act.includes("STORE") || act.includes("/STORES")) normalizedEntityName = "Store";
        else if (act.includes("RULE") || act.includes("/RULES")) normalizedEntityName = "InventoryRule";
        else if (act.includes("RECOMMENDATION") || act.includes("/RECOMMENDATIONS")) normalizedEntityName = "Recommendation";
        else normalizedEntityName = "System";
      }

      return {
        id: log.id,
        correlationId: log.correlationId,
        userId: log.userId,
        userName: actor?.fullName || "System Administrator",
        userEmail: actor?.email || "system@retailhub.internal",
        userRole: actor?.role || "ADMIN",
        action: log.action,
        entityName: normalizedEntityName,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress || "127.0.0.1",
        timestamp: log.timestamp.toISOString(),
        status: "SUCCESS" as const,
        storeId: logStoreId,
        storeCode: storeObj?.storeCode || null,
        storeName: storeObj?.name || null,
        regionId: logRegionId,
      };
    });

    // Apply Zero-Trust RBAC Data Scoping
    if (isStoreManager) {
      // 1. STORE_MANAGER: Strictly confined to user's assigned store(s)
      filtered = filtered.filter((item) => {
        return Boolean(item.storeId && assignedStoreIds.includes(item.storeId));
      });
    } else if (isRegional) {
      // 2. REGIONAL_MANAGER: Strictly confined to user's assigned region(s) and regional stores
      filtered = filtered.filter((item) => {
        const inRegion = Boolean(item.regionId && assignedRegionIds.includes(item.regionId));
        const inStore = Boolean(item.storeId && regionalStoreIds.includes(item.storeId));
        return inRegion || inStore;
      });

      // Regional manager can filter by specific store within their assigned region only
      if (storeId && storeId !== "ALL" && regionalStoreIds.includes(storeId)) {
        filtered = filtered.filter((item) => item.storeId === storeId);
      }
    } else if (isGlobal) {
      // 3. ADMIN / EXECUTIVE: Enterprise global access with unrestricted filtering
      if (storeId && storeId !== "ALL") {
        filtered = filtered.filter((item) => item.storeId === storeId);
      }
      if (regionId && regionId !== "ALL") {
        filtered = filtered.filter((item) => item.regionId === regionId);
      }
    }

    // Apply search query
    if (search) {
      filtered = filtered.filter((item) => {
        return (
          item.id.toLowerCase().includes(search) ||
          item.action.toLowerCase().includes(search) ||
          item.userName.toLowerCase().includes(search) ||
          item.userEmail.toLowerCase().includes(search) ||
          item.entityName.toLowerCase().includes(search) ||
          item.entityId.toLowerCase().includes(search) ||
          (item.storeCode && item.storeCode.toLowerCase().includes(search)) ||
          (item.storeName && item.storeName.toLowerCase().includes(search))
        );
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({
      success: true,
      data: {
        items: paginated,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/audit/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isGlobal = user?.role === "ADMIN" || user?.role === "EXECUTIVE";
    const isRegional = user?.role === "REGIONAL_MANAGER";
    const isStoreManager = user?.role === "STORE_MANAGER";

    const log = await prisma.auditLog.findUnique({
      where: { id: req.params.id },
    });
    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }

    const actor = log.userId
      ? await prisma.user.findUnique({
          where: { id: log.userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            storeAssignments: { select: { storeId: true } },
            regionAssignments: { select: { regionId: true } },
          },
        })
      : null;

    let parsedOld: any = null;
    let parsedNew: any = null;
    try {
      if (log.oldValues) parsedOld = JSON.parse(log.oldValues);
    } catch {}
    try {
      if (log.newValues) parsedNew = JSON.parse(log.newValues);
    } catch {}

    let logStoreId =
      parsedNew?.storeId ||
      parsedOld?.storeId ||
      parsedNew?.sourceStoreId ||
      parsedOld?.sourceStoreId ||
      parsedNew?.destinationStoreId ||
      parsedOld?.destinationStoreId ||
      (log.entityName === "stores" || log.entityName === "Store" ? log.entityId : null);

    if (!logStoreId && actor?.storeAssignments?.length) {
      logStoreId = actor.storeAssignments[0].storeId;
    }

    let logRegionId: string | null = parsedNew?.regionId || parsedOld?.regionId || null;
    if (logStoreId) {
      const storeObj = await prisma.store.findUnique({
        where: { id: logStoreId },
        select: { regionId: true },
      });
      if (storeObj) logRegionId = storeObj.regionId;
    }
    if (!logRegionId && actor?.regionAssignments?.length) {
      logRegionId = actor.regionAssignments[0].regionId;
    }

    // RBAC Authorization Enforcement
    if (isStoreManager) {
      const assignedStoreIds: string[] = user?.assignedStoreIds || [];
      if (!logStoreId || !assignedStoreIds.includes(logStoreId)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You do not have permission to view audit logs outside your assigned store.",
        });
      }
    } else if (isRegional) {
      const assignedRegionIds: string[] = user?.assignedRegionIds || [];
      let inRegion = Boolean(logRegionId && assignedRegionIds.includes(logRegionId));
      if (!inRegion && logStoreId) {
        const storeObj = await prisma.store.findUnique({
          where: { id: logStoreId },
          select: { regionId: true },
        });
        inRegion = Boolean(storeObj?.regionId && assignedRegionIds.includes(storeObj.regionId));
      }
      if (!inRegion) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You do not have permission to view audit logs outside your assigned region.",
        });
      }
    }

    let normalizedEntityName = log.entityName;
    if (!normalizedEntityName || normalizedEntityName === "v1" || normalizedEntityName === "Resource") {
      const act = (log.action || "").toUpperCase();
      if (act.includes("CATEGORY") || act.includes("/CATEGORIES")) normalizedEntityName = "Category";
      else if (act.includes("BRAND") || act.includes("/BRANDS")) normalizedEntityName = "Brand";
      else if (act.includes("USER") || act.includes("/USERS") || act.includes("PASSWORD")) normalizedEntityName = "User";
      else if (act.includes("PRODUCT") || act.includes("/PRODUCTS") || act.includes("SKU")) normalizedEntityName = "Product";
      else if (act.includes("TRANSFER") || act.includes("/TRANSFERS")) normalizedEntityName = "StockTransfer";
      else if (act.includes("INVENTORY") || act.includes("STOCK") || act.includes("/INVENTORY")) normalizedEntityName = "Inventory";
      else if (act.includes("STORE") || act.includes("/STORES")) normalizedEntityName = "Store";
      else if (act.includes("RULE") || act.includes("/RULES")) normalizedEntityName = "InventoryRule";
      else if (act.includes("RECOMMENDATION") || act.includes("/RECOMMENDATIONS")) normalizedEntityName = "Recommendation";
      else normalizedEntityName = "System";
    }

    res.json({
      success: true,
      data: {
        id: log.id,
        correlationId: log.correlationId,
        userId: log.userId,
        userName: actor?.fullName || "System Administrator",
        userEmail: actor?.email || "system@retailhub.internal",
        userRole: actor?.role || "ADMIN",
        action: log.action,
        entityName: normalizedEntityName,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress || "127.0.0.1",
        timestamp: log.timestamp.toISOString(),
        status: "SUCCESS",
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

