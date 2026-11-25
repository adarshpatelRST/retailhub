import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authenticateToken, hashPassword } from "../auth";
import { requireRole } from "../middleware/rbac";
import { mailService } from "../services/mail-service";
import { ConflictError, NotFoundError } from "../utils/errors";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "../../shared/schema";

const router = Router();

// Apply Authentication & Admin RBAC Guard to all /users endpoints
router.use(authenticateToken);
router.use(requireRole("ADMIN"));

// GET /api/v1/users
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;
    const users = await storage.getUsers({ role, search });

    res.json({
      success: true,
      data: users,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/users/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) throw new NotFoundError("User not found");

    res.json({
      success: true,
      data: user,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/users (Admin Onboard)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const data = parseResult.data;
    const existing = await storage.getUserByEmail(data.email);
    if (existing) {
      throw new ConflictError(`User with email ${data.email} already exists.`);
    }

    const passwordHash = await hashPassword(data.initialPassword);

    const user = await storage.createUser({
      fullName: data.fullName,
      email: data.email,
      mobileNumber: data.mobileNumber,
      passwordHash,
      role: data.role,
      storeIds: data.storeIds,
      regionIds: data.regionIds,
    });

    // Send Welcome Credentials Email asynchronously
    let scopeDesc = "Unrestricted Enterprise-Wide (All Stores)";
    if (data.role === "STORE_MANAGER" && data.storeIds?.length) {
      scopeDesc = `Store ID: ${data.storeIds.join(", ")}`;
    } else if (data.role === "REGIONAL_MANAGER" && data.regionIds?.length) {
      scopeDesc = `Region ID: ${data.regionIds.join(", ")}`;
    }

    mailService.sendWelcomeCredentials({
      toEmail: data.email,
      fullName: data.fullName,
      role: data.role,
      assignedScopeDescription: scopeDesc,
      initialPassword: data.initialPassword,
      loginUrl: process.env.APP_URL || "http://localhost:5173/login",
    });

    res.status(201).json({
      success: true,
      data: user,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/users/:id
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const existing = await storage.getUser(req.params.id);
    if (existing) {
      (req as any).auditOldValues = {
        id: existing.id,
        fullName: existing.fullName,
        email: existing.email,
        role: existing.role,
        isActive: existing.isActive,
      };
      (req as any).auditEntityId = existing.id;
    }

    const updated = await storage.updateUser(req.params.id, parseResult.data);
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

// POST /api/v1/users/:id/reset-password
router.post("/:id/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const user = await storage.getUser(req.params.id);
    if (!user) throw new NotFoundError("User not found");

    // Capture pre-reset employee metadata for audit trail
    (req as any).auditOldValues = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
    (req as any).auditEntityId = user.id;

    const newHash = await hashPassword(parseResult.data.newPassword);
    await storage.updateUserPassword(user.id, newHash);

    if (parseResult.data.sendEmail) {
      mailService.sendPasswordResetNotification({
        toEmail: user.email,
        fullName: user.fullName,
        newPassword: parseResult.data.newPassword,
        loginUrl: process.env.APP_URL || "http://localhost:5173/login",
      });
    }

    res.json({
      success: true,
      data: { success: true, message: "Password reset successfully and email dispatched." },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/users/:id/status
router.patch("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    const existing = await storage.getUser(req.params.id);
    if (existing) {
      (req as any).auditOldValues = {
        id: existing.id,
        email: existing.email,
        fullName: existing.fullName,
        role: existing.role,
        isActive: existing.isActive,
      };
      (req as any).auditEntityId = existing.id;
    }

    const updated = await storage.toggleUserStatus(req.params.id, Boolean(isActive));

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

export default router;
