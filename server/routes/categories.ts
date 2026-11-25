import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { authenticateToken } from "../auth";
import { BadRequestError, NotFoundError } from "../utils/errors";

const router = Router();

router.use(authenticateToken);

// Helper function to build recursive category tree
function buildCategoryTree(categories: any[], parentId: string | null = null, level: number = 0): any[] {
  return categories
    .filter((c) => c.parentCategoryId === parentId)
    .map((c) => {
      const subCategories = buildCategoryTree(categories, c.id, level + 1);
      return {
        id: c.id,
        categoryCode: c.code,
        name: c.name,
        parentCategoryId: c.parentCategoryId,
        level,
        productCount: c._count?.products || 0,
        subCategories,
      };
    });
}

// Helper to check if potentialParentId is a descendant of categoryId (cycle detection)
async function isDescendant(categoryId: string, potentialParentId: string): Promise<boolean> {
  let currentParentId: string | null = potentialParentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (currentParentId === categoryId) return true;
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    const parent: { parentCategoryId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentCategoryId: true },
    });

    currentParentId = parent ? parent.parentCategoryId : null;
  }

  return false;
}

// GET /api/v1/categories (Hierarchical Tree)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawCategories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const tree = buildCategoryTree(rawCategories, null, 0);

    res.json({
      success: true,
      data: tree,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/categories/flat (Flat list for tables/selectors)
router.get("/flat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parentCategory: { select: { id: true, code: true, name: true } },
        _count: {
          select: { products: true, subCategories: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      parentCategoryId: c.parentCategoryId,
      parentName: c.parentCategory?.name || null,
      parentCode: c.parentCategory?.code || null,
      productCount: c._count.products,
      subCategoryCount: c._count.subCategories,
      isLeaf: c._count.subCategories === 0,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
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

// POST /api/v1/categories (Create Category)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, name, parentCategoryId } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      throw new BadRequestError("Category code is required.");
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new BadRequestError("Category name is required.");
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    // Code regex and length check
    if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      throw new BadRequestError(
        "Code can only contain uppercase letters, numbers, and hyphens (e.g., CAT-BEVERAGES)."
      );
    }
    if (cleanCode.length < 3 || cleanCode.length > 50) {
      throw new BadRequestError("Code must be between 3 and 50 characters.");
    }

    // Name regex and length check
    if (cleanName.length < 2 || cleanName.length > 100) {
      throw new BadRequestError("Name must be between 2 and 100 characters.");
    }
    if (!/^[a-zA-Z0-9\s&/\-()]+$/.test(cleanName)) {
      throw new BadRequestError("Name contains invalid characters.");
    }

    // Check code uniqueness
    const existing = await prisma.category.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      throw new BadRequestError("Category code already exists. Please choose a unique code.");
    }

    const targetParentId = parentCategoryId ? String(parentCategoryId).trim() : null;

    // If parentCategoryId provided, verify parent exists
    if (targetParentId) {
      const parent = await prisma.category.findUnique({
        where: { id: targetParentId },
      });
      if (!parent) {
        throw new NotFoundError("Selected parent category does not exist.");
      }
    }

    // Sibling uniqueness under same parent category (case-insensitive)
    const siblings = await prisma.category.findMany({
      where: { parentCategoryId: targetParentId },
      select: { id: true, name: true },
    });
    if (siblings.some((s) => s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      throw new BadRequestError("A subcategory with this name already exists under the selected parent.");
    }

    const newCategory = await prisma.category.create({
      data: {
        code: cleanCode,
        name: cleanName,
        parentCategoryId: targetParentId || null,
        isActive: true,
      },
      include: {
        parentCategory: true,
      },
    });

    res.status(201).json({
      success: true,
      data: newCategory,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/categories/:id (Update Category)
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, parentCategoryId, isActive } = req.body;

    const existing = await prisma.category.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundError("Category not found.");

    // Attach pre-mutation snapshot and entity ID for audit logging
    (req as any).auditOldValues = {
      id: existing.id,
      code: existing.code,
      name: existing.name,
      parentCategoryId: existing.parentCategoryId,
      isActive: existing.isActive,
    };
    (req as any).auditEntityId = existing.code || existing.id;

    // Validate self-parenting
    if (parentCategoryId && parentCategoryId === id) {
      throw new BadRequestError("A category cannot be its own parent.");
    }

    // Validate cycle prevention
    if (parentCategoryId && parentCategoryId !== existing.parentCategoryId) {
      const causesCycle = await isDescendant(id, parentCategoryId);
      if (causesCycle) {
        throw new BadRequestError(
          "Invalid parent category: cannot set a subcategory as parent (cycle detected).",
        );
      }
    }

    const targetParentId =
      parentCategoryId !== undefined
        ? parentCategoryId
          ? String(parentCategoryId).trim()
          : null
        : existing.parentCategoryId;

    let cleanName: string | undefined = undefined;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        throw new BadRequestError("Category name is required.");
      }
      cleanName = name.trim();
      if (cleanName.length < 2 || cleanName.length > 100) {
        throw new BadRequestError("Name must be between 2 and 100 characters.");
      }
      if (!/^[a-zA-Z0-9\s&/\-()]+$/.test(cleanName)) {
        throw new BadRequestError("Name contains invalid characters.");
      }
    }

    const checkName = cleanName ?? existing.name;

    // Check sibling uniqueness under target parent (excluding self)
    const siblings = await prisma.category.findMany({
      where: {
        parentCategoryId: targetParentId,
        id: { not: id },
      },
      select: { id: true, name: true },
    });
    if (siblings.some((s) => s.name.trim().toLowerCase() === checkName.toLowerCase())) {
      throw new BadRequestError("A subcategory with this name already exists under the selected parent.");
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: cleanName,
        parentCategoryId: targetParentId,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      include: {
        parentCategory: true,
      },
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

// DELETE /api/v1/categories/:id (Soft Delete Category with Protection)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundError("Category not found.");

    // Attach pre-mutation snapshot and entity ID for audit logging
    (req as any).auditOldValues = {
      id: category.id,
      code: category.code,
      name: category.name,
      parentCategoryId: category.parentCategoryId,
      isActive: category.isActive,
    };
    (req as any).auditEntityId = category.code || category.id;

    // Soft delete by deactivating category
    const updated = await prisma.category.update({
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
