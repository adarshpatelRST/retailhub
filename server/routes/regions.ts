import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { authenticateToken } from "../auth";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/regions
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await prisma.region.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { stores: true, users: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = regions.map((r) => ({
      id: r.id,
      regionCode: r.code,
      code: r.code,
      name: r.name,
      storeCount: r._count.stores,
      managerCount: r._count.users,
      isActive: r.isActive,
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

export default router;
