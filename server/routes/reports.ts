import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken } from "../auth";
import { prisma } from "../db";
import { serializeDecimal } from "../utils/field-mapping";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/reports/audit
router.get("/audit", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    res.json({
      success: true,
      data: logs,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/sales
router.get("/sales", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.salesTransaction.findMany({
      include: { store: true, lines: { include: { product: true } } },
      orderBy: { transactionDate: "desc" },
      take: 100,
    });

    res.json({
      success: true,
      data: transactions,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
