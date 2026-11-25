import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { authenticateToken } from "../auth";
import { BadRequestError, NotFoundError } from "../utils/errors";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/brands
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = brands.map((b) => ({
      id: b.id,
      brandCode: b.code,
      code: b.code,
      name: b.name,
      isActive: b.isActive,
      productCount: b._count.products,
      createdAt: b.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: formatted,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/brands (Create Brand)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, name } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      throw new BadRequestError("Brand code is required.");
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new BadRequestError("Brand name is required.");
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    // Code regex and length check
    if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      throw new BadRequestError(
        "Code must contain only uppercase letters, numbers, and hyphens (e.g., BRD-AMUL)."
      );
    }
    if (cleanCode.length < 2 || cleanCode.length > 50) {
      throw new BadRequestError("Brand code must be between 2 and 50 characters.");
    }

    // Name length and character set check
    if (cleanName.length < 2 || cleanName.length > 100) {
      throw new BadRequestError("Brand name must be between 2 and 100 characters.");
    }
    if (!/^[a-zA-Z0-9\s&.'\-()]+$/.test(cleanName)) {
      throw new BadRequestError("Brand name contains invalid characters.");
    }

    // Check code uniqueness
    const existing = await prisma.brand.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new BadRequestError("Brand code already exists. Please enter a unique code.");
    }

    // Case-insensitive brand name uniqueness
    const allBrands = await prisma.brand.findMany({
      select: { id: true, name: true },
    });
    if (allBrands.some((b) => b.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      throw new BadRequestError("Brand name already exists. Please enter a unique name.");
    }

    const brand = await prisma.brand.create({
      data: {
        code: cleanCode,
        name: cleanName,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: brand,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/brands/:id (Update Brand)
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const existing = await prisma.brand.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundError("Brand not found.");

    // Attach pre-mutation snapshot and entity ID for audit logging
    (req as any).auditOldValues = {
      id: existing.id,
      code: existing.code,
      name: existing.name,
      isActive: existing.isActive,
    };
    (req as any).auditEntityId = existing.code || existing.id;

    let cleanName: string | undefined = undefined;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        throw new BadRequestError("Brand name is required.");
      }
      cleanName = name.trim();
      if (cleanName.length < 2 || cleanName.length > 100) {
        throw new BadRequestError("Brand name must be between 2 and 100 characters.");
      }
      if (!/^[a-zA-Z0-9\s&.'\-()]+$/.test(cleanName)) {
        throw new BadRequestError("Brand name contains invalid characters.");
      }

      // Check case-insensitive uniqueness against other brands
      const otherBrands = await prisma.brand.findMany({
        where: { id: { not: id } },
        select: { id: true, name: true },
      });
      if (otherBrands.some((b) => b.name.trim().toLowerCase() === cleanName!.toLowerCase())) {
        throw new BadRequestError("Brand name already exists. Please enter a unique name.");
      }
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: cleanName,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.json({
      success: true,
      data: brand,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/brands/:id (Soft Delete Brand)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const brand = await prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) throw new NotFoundError("Brand not found.");

    // Attach pre-mutation snapshot and entity ID for audit logging
    (req as any).auditOldValues = {
      id: brand.id,
      code: brand.code,
      name: brand.name,
      isActive: brand.isActive,
    };
    (req as any).auditEntityId = brand.code || brand.id;

    // Soft delete by deactivating brand
    const updated = await prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      data: { id, isActive: false, softDeleted: true },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
