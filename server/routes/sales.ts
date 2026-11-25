import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { authenticateToken } from "../auth";
import { buildDateFilter } from "../utils/field-mapping";

const router = Router();

router.use(authenticateToken);

// Handler for POS transactions
const handleGetTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string)?.trim() || "";
    const storeId = (req.query.storeId as string) || undefined;
    const regionId = (req.query.regionId as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;

    const user = (req as any).user;
    const isGlobal = !user || user.role === "ADMIN" || user.role === "EXECUTIVE";
    const isRegional = user?.role === "REGIONAL_MANAGER";
    const isStoreManager = user?.role === "STORE_MANAGER";

    // Build store filter with RBAC enforcement
    let allowedStoreIds: string[] | undefined = undefined;

    if (isStoreManager) {
      // Store Manager is strictly restricted to assigned stores
      allowedStoreIds = user.assignedStoreIds || [];
    } else if (isRegional) {
      // Regional Manager restricted to their assigned regions
      const assignedRegions = user.assignedRegionIds || [];
      const storeWhere: any = { regionId: { in: assignedRegions } };
      if (storeId && storeId !== "ALL") {
        storeWhere.id = storeId;
      }
      const matchedStores = await prisma.store.findMany({
        where: storeWhere,
        select: { id: true },
      });
      allowedStoreIds = matchedStores.map((s) => s.id);
    } else {
      // Admin / Executive (Global scope)
      const storeWhere: any = {};
      if (storeId && storeId !== "ALL") {
        storeWhere.id = storeId;
      } else if (regionId && regionId !== "ALL") {
        storeWhere.regionId = regionId;
      }

      if (Object.keys(storeWhere).length > 0) {
        const matchedStores = await prisma.store.findMany({
          where: storeWhere,
          select: { id: true },
        });
        allowedStoreIds = matchedStores.map((s) => s.id);
      }
    }

    const where: any = {};
    if (allowedStoreIds) {
      where.storeId = { in: allowedStoreIds };
    }

    const dateRange = buildDateFilter(startDate, endDate);
    if (dateRange) {
      where.transactionDate = dateRange;
    }

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search } },
        { store: { name: { contains: search } } },
        { store: { storeCode: { contains: search } } },
        { lines: { some: { product: { name: { contains: search } } } } },
        { lines: { some: { product: { sku: { contains: search } } } } },
      ];
    }

    const [totalCount, transactions, salesSummary] = await Promise.all([
      prisma.salesTransaction.count({ where }),
      prisma.salesTransaction.findMany({
        where,
        include: {
          store: {
            include: { region: true },
          },
          lines: {
            include: {
              product: {
                include: { category: true, brand: true },
              },
            },
          },
        },
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesTransaction.aggregate({
        where,
        _sum: { totalAmount: true, totalQuantity: true },
        _count: { id: true },
      }),
    ]);

    // Flatten transactions into line items for detailed POS reporting
    const flatItems: any[] = [];
    const searchLower = search.toLowerCase();

    for (const tx of transactions) {
      for (const line of tx.lines) {
        const qty = Number(line.quantity);
        const unitPrice = Number(line.unitPrice);
        const discount = Number(line.discount || 0);
        const netSales = Number(line.netAmount);
        const costPrice = Number(line.product?.costPrice || 0);
        const grossMargin = netSales - costPrice * qty;
        const marginPct = netSales > 0 ? Math.round((grossMargin / netSales) * 100) : 0;

        const lineSku = (line.product?.sku || "").toLowerCase();
        const lineProd = (line.product?.name || "").toLowerCase();
        const lineCode = (line.product?.productCode || "").toLowerCase();
        const txNum = tx.transactionNumber.toLowerCase();
        const stName = tx.store.name.toLowerCase();
        const stCode = tx.store.storeCode.toLowerCase();

        // If search was supplied, only include line items that match search criteria
        if (searchLower) {
          const matchesProduct = lineSku.includes(searchLower) || lineProd.includes(searchLower) || lineCode.includes(searchLower);
          const matchesInvoiceOrStore = txNum.includes(searchLower) || stName.includes(searchLower) || stCode.includes(searchLower);

          if (!matchesProduct && !matchesInvoiceOrStore) {
            continue;
          }
          // If query targets an SKU specifically (e.g. contains 'sku-' or starts with 'sku'), require line product match
          if ((searchLower.includes("sku") || searchLower.includes("ean")) && !matchesProduct) {
            continue;
          }
        }

        flatItems.push({
          id: line.id,
          transactionId: tx.id,
          invoiceNumber: tx.transactionNumber,
          transactionDate: tx.transactionDate.toISOString(),
          storeId: tx.storeId,
          storeCode: tx.store.storeCode,
          storeName: tx.store.name,
          regionName: tx.store.region?.name || "Corporate",
          sku: line.product?.sku || "N/A",
          productName: line.product?.name || "Product",
          categoryName: line.product?.category?.name || "General",
          brandName: line.product?.brand?.name || "Brand",
          quantitySold: qty,
          unitSellingPrice: unitPrice,
          discountAmount: discount,
          netSalesAmount: netSales,
          grossMarginAmount: grossMargin,
          marginPercent: marginPct,
        });
      }
    }

    // Ensure recent transactions are strictly displayed at the top (Page 1, Row 1)
    flatItems.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    const totalRevenue = Number(salesSummary._sum.totalAmount || 0);
    const totalUnits = Number(salesSummary._sum.totalQuantity || 0);
    const totalTx = salesSummary._count.id || 0;
    const aov = totalTx > 0 ? Math.round(totalRevenue / totalTx) : 0;

    res.json({
      success: true,
      data: {
        items: flatItems,
        meta: {
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          page,
          limit,
        },
        summary: {
          totalRevenue,
          totalTransactions: totalTx,
          totalUnitsSold: totalUnits,
          averageOrderValue: aov,
        },
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/sales/simulate
 * Simulates a register POS sale for an SKU at a store.
 * Validates quantity <= availableStock, records double-entry movement, and creates transaction.
 */
router.post(["/simulate", "/transactions/simulate"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, productId, quantity } = req.body || {};
    const qty = Number(quantity);

    if (!storeId || !productId || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PARAMETERS", message: "storeId, productId, and a positive quantity are required." },
      });
    }

    // Resolve store
    const store = await prisma.store.findFirst({
      where: { OR: [{ id: storeId }, { storeCode: storeId.toUpperCase() }] },
      select: { id: true, storeCode: true, name: true, regionId: true },
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: { code: "STORE_NOT_FOUND", message: `Store ${storeId} not found.` },
      });
    }

    // Resolve product
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: productId }, { sku: productId }] },
      select: { id: true, sku: true, name: true, costPrice: true, sellingPrice: true, mrp: true },
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: "PRODUCT_NOT_FOUND", message: `Product ${productId} not found.` },
      });
    }

    // Fetch current inventory
    const inventory = await prisma.inventory.findUnique({
      where: { storeId_productId: { storeId: store.id, productId: product.id } },
    });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: { code: "INVENTORY_NOT_FOUND", message: `No inventory record found for ${product.sku} at ${store.storeCode}.` },
      });
    }

    const availableStock = Number(inventory.availableQuantity) || 0;
    if (qty > availableStock) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INSUFFICIENT_STOCK",
          message: `Requested sale quantity (${qty.toFixed(3)}) exceeds current available shelf stock (${availableStock.toFixed(3)}).`,
        },
      });
    }

    // Execute atomic sale
    const result = await prisma.$transaction(async (tx) => {
      const nextStock = Number((availableStock - qty).toFixed(3));
      const invoiceNumber = `POS-SIM-${store.storeCode}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Decrement inventory
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          availableQuantity: nextStock,
          version: { increment: 1 },
        },
      });

      // 2. Double-entry inventory movement
      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          movementType: "POS_SALE",
          quantity: -qty,
          referenceType: "POS_TRANSACTION",
          referenceId: invoiceNumber,
          remarks: `Simulated POS register checkout (${qty} units of ${product.sku})`,
          createdBy: req.user?.id || "admin",
        },
      });

      // 3. Price & Gross Margin calculations
      const unitPrice = Number(product.sellingPrice) || Math.round(Number(product.costPrice) * 1.25);
      const costPrice = Number(product.costPrice) || 0;
      const netAmount = Number((unitPrice * qty).toFixed(2));
      const grossMargin = Number((netAmount - costPrice * qty).toFixed(2));

      // 4. Create SalesTransaction
      const salesTx = await tx.salesTransaction.create({
        data: {
          transactionNumber: invoiceNumber,
          storeId: store.id,
          transactionDate: new Date(),
          totalAmount: netAmount,
          totalQuantity: qty,
          lines: {
            create: [
              {
                productId: product.id,
                quantity: qty,
                unitPrice,
                discount: 0,
                netAmount,
              },
            ],
          },
        },
        include: {
          lines: { include: { product: true } },
          store: true,
        },
      });

      return {
        transaction: salesTx,
        newAvailableQuantity: nextStock,
        invoiceNumber,
        unitPrice,
        netAmount,
        grossMargin,
      };
    });

    res.json({
      success: true,
      data: result,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", handleGetTransactions);
router.get("/transactions", handleGetTransactions);

export default router;
