import { prisma } from "./db";
import { serializeDecimal } from "./utils/field-mapping";
import { AppError, ConflictError, NotFoundError } from "./utils/errors";
import { UserRole } from "../shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  getUsers(params?: { role?: string; search?: string }): Promise<any[]>;
  createUser(data: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  updateUserPassword(id: string, hash: string): Promise<any>;
  toggleUserStatus(id: string, isActive: boolean): Promise<any>;

  // Products
  getProducts(params?: { search?: string; categoryId?: string }): Promise<any[]>;
  getProduct(id: string): Promise<any>;

  // Stores
  getStores(params?: { regionId?: string }): Promise<any[]>;
  getStore(id: string): Promise<any>;

  // Inventory
  getInventory(storeId: string, productId: string): Promise<any>;
  getStoreInventory(storeId: string): Promise<any[]>;
  adjustStock(params: {
    storeId: string;
    productId: string;
    adjustmentQty: number;
    reason: string;
    currentVersion: number;
    userId: string;
  }): Promise<any>;

  // Transfers
  getTransfers(params?: { storeId?: string; status?: string }): Promise<any[]>;
  createTransfer(data: any): Promise<any>;
  updateTransferStatus(id: string, status: string, userId: string): Promise<any>;

  // Recommendations
  getRecommendations(params?: { storeId?: string; status?: string }): Promise<any[]>;
  actionRecommendation(id: string, actionType: string, comments?: string, userId?: string): Promise<any>;
}

// Helper: Safely resolve and validate regionIds against database records
async function resolveRegionIds(tx: any, regionIds?: string[]): Promise<string[]> {
  if (!regionIds || regionIds.length === 0) return [];
  const allRegions = await tx.region.findMany({ select: { id: true, code: true } });
  const resolved = new Set<string>();

  for (const rawId of regionIds) {
    if (!rawId) continue;
    const clean = String(rawId).trim();
    // 1. Exact match on id (UUID)
    const byId = allRegions.find((r: any) => r.id === clean);
    if (byId) {
      resolved.add(byId.id);
      continue;
    }
    // 2. Match by code or slug (e.g. REG-DELHI-NCR or reg-delhi-ncr)
    const byCode = allRegions.find(
      (r: any) =>
        r.code.toUpperCase() === clean.toUpperCase() ||
        r.code.toUpperCase() === clean.replace(/^reg-/, "REG-").toUpperCase() ||
        r.code.replace(/[\-_]/g, "").toUpperCase() === clean.replace(/[\-_]/g, "").toUpperCase()
    );
    if (byCode) {
      resolved.add(byCode.id);
    }
  }

  return Array.from(resolved);
}

// Helper: Safely resolve and validate storeIds against database records
async function resolveStoreIds(tx: any, storeIds?: string[]): Promise<string[]> {
  if (!storeIds || storeIds.length === 0) return [];
  const allStores = await tx.store.findMany({ select: { id: true, storeCode: true } });
  const resolved = new Set<string>();

  for (const rawId of storeIds) {
    if (!rawId) continue;
    const clean = String(rawId).trim();
    // 1. Exact match on id (UUID)
    const byId = allStores.find((s: any) => s.id === clean);
    if (byId) {
      resolved.add(byId.id);
      continue;
    }
    // 2. Match by storeCode or slug (e.g. BPL-001 or store-bpl-001)
    const byCode = allStores.find(
      (s: any) =>
        s.storeCode.toUpperCase() === clean.toUpperCase() ||
        clean.toUpperCase().includes(s.storeCode.toUpperCase())
    );
    if (byCode) {
      resolved.add(byCode.id);
    }
  }

  return Array.from(resolved);
}

export class PrismaStorage implements IStorage {
  async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        storeAssignments: { include: { store: true } },
        regionAssignments: { include: { region: true } },
      },
    });
    return user;
  }

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        storeAssignments: true,
        regionAssignments: true,
      },
    });
  }

  async getUsers(params?: { role?: string; search?: string }) {
    const where: any = {};
    if (params?.role && params.role !== "ALL") where.role = params.role as any;
    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { mobileNumber: { contains: q } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        storeAssignments: { include: { store: { select: { id: true, name: true, storeCode: true } } } },
        regionAssignments: { include: { region: { select: { id: true, name: true, code: true } } } },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      mobileNumber: u.mobileNumber,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      assignedStores: u.storeAssignments.map((sa) => ({
        id: sa.store.id,
        name: sa.store.name,
        storeCode: sa.store.storeCode,
      })),
      assignedRegions: u.regionAssignments.map((ra) => ({
        id: ra.region.id,
        name: ra.region.name,
        code: ra.region.code,
      })),
    }));
  }

  async createUser(data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    passwordHash: string;
    role: UserRole;
    storeIds?: string[];
    regionIds?: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          mobileNumber: data.mobileNumber,
          passwordHash: data.passwordHash,
          role: data.role as any,
          isActive: true,
        },
      });

      if (data.role === "STORE_MANAGER" && data.storeIds?.length) {
        const validStoreIds = await resolveStoreIds(tx, data.storeIds);
        if (validStoreIds.length > 0) {
          await tx.userStoreAssignment.createMany({
            data: validStoreIds.map((storeId) => ({ userId: user.id, storeId })),
          });
        }
      }

      if (data.role === "REGIONAL_MANAGER" && data.regionIds?.length) {
        const validRegionIds = await resolveRegionIds(tx, data.regionIds);
        if (validRegionIds.length > 0) {
          await tx.userRegionAssignment.createMany({
            data: validRegionIds.map((regionId) => ({ userId: user.id, regionId })),
          });
        }
      }

      return user;
    });
  }

  async updateUser(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          fullName: data.fullName,
          mobileNumber: data.mobileNumber,
          role: data.role,
          isActive: data.isActive,
        },
      });

      if (data.storeIds !== undefined) {
        await tx.userStoreAssignment.deleteMany({ where: { userId: id } });
        if (data.role === "STORE_MANAGER" && data.storeIds.length) {
          const validStoreIds = await resolveStoreIds(tx, data.storeIds);
          if (validStoreIds.length > 0) {
            await tx.userStoreAssignment.createMany({
              data: validStoreIds.map((storeId: string) => ({ userId: id, storeId })),
            });
          }
        }
      }

      if (data.regionIds !== undefined) {
        await tx.userRegionAssignment.deleteMany({ where: { userId: id } });
        if (data.role === "REGIONAL_MANAGER" && data.regionIds.length) {
          const validRegionIds = await resolveRegionIds(tx, data.regionIds);
          if (validRegionIds.length > 0) {
            await tx.userRegionAssignment.createMany({
              data: validRegionIds.map((regionId: string) => ({ userId: id, regionId })),
            });
          }
        }
      }

      return user;
    });
  }

  async updateUserPassword(id: string, hash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash: hash },
    });
  }

  async toggleUserStatus(id: string, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async getProducts(params?: { search?: string; categoryId?: string }) {
    const where: any = { isActive: true };
    if (params?.categoryId) where.categoryId = params.categoryId;
    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { productCode: q }, // Barcode exact
        { sku: { contains: q } },
        { name: { contains: q } },
      ];
    }
    return prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      take: 100,
    });
  }

  async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true, brand: true },
    });
  }

  async getStores(params?: { regionId?: string; isActive?: boolean }) {
    const where: any = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params?.regionId) where.regionId = params.regionId;
    return prisma.store.findMany({
      where,
      include: { region: true, storeType: true },
      orderBy: { name: "asc" },
    });
  }

  async getStore(id: string) {
    return prisma.store.findUnique({
      where: { id },
      include: { region: true, storeType: true },
    });
  }

  async getInventory(storeId: string, productId: string) {
    return prisma.inventory.findUnique({
      where: { storeId_productId: { storeId, productId } },
      include: { product: true },
    });
  }

  async getStoreInventory(storeId: string) {
    return prisma.inventory.findMany({
      where: { storeId },
      include: { product: { include: { category: true } } },
      take: 200,
    });
  }

  async adjustStock(params: {
    storeId: string;
    productId: string;
    adjustmentQty: number;
    reason: string;
    currentVersion: number;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { storeId_productId: { storeId: params.storeId, productId: params.productId } },
      });

      if (!inv) throw new NotFoundError("Inventory record not found");
      if (inv.version !== params.currentVersion) {
        throw new ConflictError("Inventory concurrency conflict: record was modified by another transaction.");
      }

      const nextQty = Math.max(0, serializeDecimal(inv.availableQuantity) + params.adjustmentQty);

      const updated = await tx.inventory.update({
        where: { id: inv.id },
        data: {
          availableQuantity: nextQty,
          version: { increment: 1 },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inv.id,
          movementType: "STOCK_ADJUSTMENT",
          quantity: params.adjustmentQty,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: `ADJ-${Date.now()}`,
          remarks: params.reason,
          createdBy: params.userId,
        },
      });

      return updated;
    });
  }

  async getTransfers(params?: { storeId?: string; status?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.storeId) {
      where.OR = [{ fromStoreId: params.storeId }, { toStoreId: params.storeId }];
    }
    return prisma.stockTransfer.findMany({
      where,
      include: {
        fromStore: true,
        toStore: true,
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTransfer(data: {
    fromStoreId: string;
    toStoreId: string;
    productId: string;
    requestedQty: number;
    userId: string;
    remarks?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const transferNumber = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          fromStoreId: data.fromStoreId,
          toStoreId: data.toStoreId,
          status: "APPROVED_IN_TRANSIT",
          requestedBy: data.userId,
          lines: {
            create: {
              productId: data.productId,
              requestedQty: data.requestedQty,
              approvedQty: data.requestedQty,
            },
          },
        },
        include: { lines: true },
      });

      // Update donor store inventory
      const donorInv = await tx.inventory.findUnique({
        where: { storeId_productId: { storeId: data.fromStoreId, productId: data.productId } },
      });

      if (donorInv) {
        await tx.inventory.update({
          where: { id: donorInv.id },
          data: {
            availableQuantity: { decrement: data.requestedQty },
            inTransitQuantity: { increment: data.requestedQty },
          },
        });
      }

      return transfer;
    });
  }

  async updateTransferStatus(id: string, status: string, userId: string) {
    return prisma.stockTransfer.update({
      where: { id },
      data: { status: status as any, receivedBy: userId, receivedAt: new Date() },
    });
  }

  async getRecommendations(params?: { storeId?: string; status?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.storeId) where.storeId = params.storeId;
    return prisma.recommendation.findMany({
      where,
      include: {
        store: true,
        fromStore: true,
        product: { include: { category: true } },
        evidence: true,
        actions: {
          include: { user: true },
          orderBy: { actionedOn: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async actionRecommendation(id: string, actionType: string, comments?: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const rec = await tx.recommendation.findUnique({ where: { id } });
      if (!rec) throw new NotFoundError("Recommendation not found");

      const updated = await tx.recommendation.update({
        where: { id },
        data: { status: actionType === "APPROVE" ? "APPROVED" : "REJECTED" },
      });

      if (userId) {
        await tx.action.create({
          data: {
            recommendationId: id,
            actionType: actionType as any,
            actionedBy: userId,
            comments,
          },
        });
      }

      return updated;
    });
  }
}

export const storage = new PrismaStorage();
