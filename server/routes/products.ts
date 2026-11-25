import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { authenticateToken } from "../auth";
import { BadRequestError, NotFoundError } from "../utils/errors";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/products
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const brandId = req.query.brandId as string | undefined;
    const isActiveParam = req.query.isActive as string | undefined;

    const where: any = {};
    if (isActiveParam !== undefined && isActiveParam !== "") {
      where.isActive = isActiveParam === "true" || isActiveParam === "1";
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { productCode: { contains: q } },
        { sku: { contains: q } },
        { name: { contains: q } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, code: true, name: true } },
          brand: { select: { id: true, code: true, name: true } },
          inventories: {
            select: {
              availableQuantity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formatted = products.map((p: any) => {
      const totalStock = (p.inventories || []).reduce(
        (sum: number, inv: any) => sum + Number(inv.availableQuantity || 0),
        0
      );
      return {
        id: p.id,
        sku: p.sku,
        productCode: p.productCode,
        name: p.name,
        description: p.description,
        brandId: p.brandId,
        brandName: p.brand?.name,
        brandCode: p.brand?.code,
        categoryId: p.categoryId,
        categoryName: p.category?.name,
        categoryCode: p.category?.code,
        unitOfMeasure: p.unitOfMeasure,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        mrp: Number(p.mrp),
        totalStockUnits: Math.round(totalStock * 100) / 100,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      success: true,
      data: {
        items: formatted,
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

// POST /api/v1/products/batch (Chunked CSV Import with Category Leaf & Brand Resolution)
router.post("/batch", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawList = Array.isArray(req.body)
      ? req.body
      : req.body?.products || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new BadRequestError("No product records provided for batch processing.");
    }

    // Pre-fetch all active brands and categories for fast in-memory resolution
    const [allBrands, allCategories] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, code: true, name: true } }),
      prisma.category.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          parentCategoryId: true,
          subCategories: { select: { id: true } },
        },
      }),
    ]);

    const brandMap = new Map<string, { id: string; code: string; name: string }>();
    for (const b of allBrands) {
      brandMap.set(b.code.toUpperCase().trim(), b);
    }

    const categoryMap = new Map<
      string,
      { id: string; code: string; name: string; isLeaf: boolean }
    >();
    for (const c of allCategories) {
      const isLeaf = c.subCategories.length === 0;
      categoryMap.set(c.code.toUpperCase().trim(), {
        id: c.id,
        code: c.code,
        name: c.name,
        isLeaf,
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: Array<{ rowNumber: number; sku: string; reason: string }> = [];

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      const rowNum = i + 1;
      const sku = (row.sku || "").trim().toUpperCase();

      if (!sku) {
        failedCount++;
        errors.push({
          rowNumber: rowNum,
          sku: "UNKNOWN",
          reason: "SKU code cannot be empty.",
        });
        continue;
      }

      // 1. Resolve Brand
      const brandCode = (row.brandCode || "").trim().toUpperCase();
      const resolvedBrand = brandMap.get(brandCode);
      if (!resolvedBrand) {
        failedCount++;
        errors.push({
          rowNumber: rowNum,
          sku,
          reason: `Brand '${row.brandCode}' not found. Please provide a valid brand code.`,
        });
        continue;
      }

      // 2. Resolve Category & Validate Leaf Node
      const categoryCode = (row.categoryCode || "").trim().toUpperCase();
      const resolvedCat = categoryMap.get(categoryCode);
      if (!resolvedCat) {
        failedCount++;
        errors.push({
          rowNumber: rowNum,
          sku,
          reason: `Category '${row.categoryCode}' not found. Please provide a valid leaf category.`,
        });
        continue;
      }

      if (!resolvedCat.isLeaf) {
        failedCount++;
        errors.push({
          rowNumber: rowNum,
          sku,
          reason: `Category '${row.categoryCode}' is a parent category with subcategories. Products must be assigned to a leaf category.`,
        });
        continue;
      }

      // 3. Price Validation
      const costPrice = Math.max(0, parseFloat(row.costPrice) || 0);
      const sellingPrice = Math.max(0, parseFloat(row.sellingPrice) || 0);
      const mrp = Math.max(0, parseFloat(row.mrp) || 0);

      if (sellingPrice > mrp) {
        failedCount++;
        errors.push({
          rowNumber: rowNum,
          sku,
          reason: `Store selling price (₹${sellingPrice}) cannot exceed MRP (₹${mrp}).`,
        });
        continue;
      }

      // 4. Upsert Product
      const productCode = (row.productCode || sku).trim();
      const name = (row.name || sku).trim();
      const unitOfMeasure = (row.unitOfMeasure || "PIECE").trim().toUpperCase();

      try {
        const existing = await prisma.product.findUnique({
          where: { sku },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              productCode,
              name,
              brandId: resolvedBrand.id,
              categoryId: resolvedCat.id,
              unitOfMeasure,
              costPrice,
              sellingPrice,
              mrp,
              isActive: true,
            },
          });
          updatedCount++;
        } else {
          await prisma.product.create({
            data: {
              sku,
              productCode,
              name,
              brandId: resolvedBrand.id,
              categoryId: resolvedCat.id,
              unitOfMeasure,
              costPrice,
              sellingPrice,
              mrp,
              isActive: true,
            },
          });
          insertedCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push({
          rowNumber: rowNum,
          sku,
          reason: err.message || "Database write failure during SKU upsert.",
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalProcessed: rawList.length,
        insertedCount,
        updatedCount,
        failedCount,
        errors,
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/products (Create Single Product)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      sku,
      productCode,
      name,
      description,
      brandId,
      categoryId,
      unitOfMeasure,
      costPrice,
      sellingPrice,
      mrp,
      isActive,
    } = req.body;

    if (!sku || !productCode || !name || !brandId || !categoryId) {
      throw new BadRequestError("Missing required product fields.");
    }

    // Verify category is leaf
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subCategories: true },
    });

    if (!category) {
      throw new NotFoundError("Selected category does not exist.");
    }

    if (category.subCategories.length > 0) {
      throw new BadRequestError("Products must be assigned to a leaf category.");
    }

    const product = await prisma.product.create({
      data: {
        sku: sku.trim().toUpperCase(),
        productCode: productCode.trim(),
        name: name.trim(),
        description: description?.trim(),
        brandId,
        categoryId,
        unitOfMeasure: unitOfMeasure || "PIECE",
        costPrice: Math.max(0, Number(costPrice) || 0),
        sellingPrice: Math.max(0, Number(sellingPrice) || 0),
        mrp: Math.max(0, Number(mrp) || 0),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: { category: true, brand: true },
    });

    res.status(201).json({
      success: true,
      data: product,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        brand: true,
        inventories: {
          include: {
            store: {
              select: { id: true, name: true, storeCode: true, city: true },
            },
          },
        },
      },
    });
    if (!product) throw new NotFoundError("Product not found");

    const totalStock = (product.inventories || []).reduce(
      (sum: number, inv: any) => sum + Number(inv.availableQuantity || 0),
      0
    );

    const formattedProduct = {
      ...product,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
      mrp: Number(product.mrp),
      totalStockUnits: Math.round(totalStock * 100) / 100,
    };

    res.json({
      success: true,
      data: formattedProduct,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/products/:id
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Product not found");

    (req as any).auditOldValues = existing;
    (req as any).auditEntityId = existing.sku || existing.id;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        brandId: data.brandId,
        categoryId: data.categoryId,
        unitOfMeasure: data.unitOfMeasure,
        costPrice: data.costPrice !== undefined ? Math.max(0, Number(data.costPrice)) : undefined,
        sellingPrice: data.sellingPrice !== undefined ? Math.max(0, Number(data.sellingPrice)) : undefined,
        mrp: data.mrp !== undefined ? Math.max(0, Number(data.mrp)) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      },
      include: { category: true, brand: true },
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

// DELETE /api/v1/products/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (existing) {
      (req as any).auditOldValues = existing;
      (req as any).auditEntityId = existing.sku || existing.id;
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      data: { id, deleted: true },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
