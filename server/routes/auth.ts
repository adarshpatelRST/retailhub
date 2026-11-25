import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authenticateToken, hashPassword, signJwt, verifyPassword } from "../auth";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import { auditService } from "../services/audit-service";
import { mailService } from "../services/mail-service";
import { changePasswordSchema, loginSchema } from "../../shared/schema";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const { email, password } = parseResult.data;
    const user = await storage.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedError("Invalid corporate email or password.");
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedError("Invalid corporate email or password.");
    }

    if (!user.isActive) {
      throw new ForbiddenError("Account has been deactivated. Contact your Administrator.");
    }

    const assignedStoreIds = user.storeAssignments?.map((a: any) => a.storeId) || [];
    const assignedRegionIds = user.regionAssignments?.map((a: any) => a.regionId) || [];

    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      assignedStoreIds,
      assignedRegionIds,
    });

    await auditService.record({
      userId: user.id,
      action: "LOGIN",
      entityName: "User",
      entityId: user.id,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          mobileNumber: user.mobileNumber,
          avatarUrl: user.avatarUrl,
          role: user.role,
          assignedStoreIds,
          assignedRegionIds,
        },
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get("/me", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) throw new UnauthorizedError("User profile not found");

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
        assignedStoreIds: user.storeAssignments?.map((a: any) => a.storeId) || [],
        assignedRegionIds: user.regionAssignments?.map((a: any) => a.regionId) || [],
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/change-password
router.post("/change-password", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      throw new UnauthorizedError("User account not found.");
    }

    const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      throw new UnauthorizedError("Current password is not correct.");
    }

    const newHash = await hashPassword(newPassword);
    await storage.updateUserPassword(user.id, newHash);

    await auditService.record({
      userId: user.id,
      action: "CHANGE_PASSWORD",
      entityName: "User",
      entityId: user.id,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: { success: true, message: "Password updated successfully." },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

interface PasswordResetOtpSession {
  email: string;
  otp: string;
  expiresAt: number;
  verified: boolean;
}

const otpSessions = new Map<string, PasswordResetOtpSession>();

// POST /api/v1/auth/forgot-password/request-otp
router.post("/forgot-password/request-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawEmail = req.body.email;
    if (!rawEmail || typeof rawEmail !== "string") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "A valid corporate email is required." },
      });
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await storage.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "No account found with this corporate email address." },
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpSessions.set(email, {
      email,
      otp,
      expiresAt,
      verified: false,
    });

    await mailService.sendPasswordResetOtp(user.email, user.fullName, otp);

    res.json({
      success: true,
      data: {
        message: "A 6-digit verification code has been dispatched to your email address.",
        email: user.email,
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/forgot-password/verify-otp
router.post("/forgot-password/verify-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: rawEmail, otp: rawOtp } = req.body;
    if (!rawEmail || !rawOtp) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Email and verification code are required." },
      });
    }

    const email = String(rawEmail).trim().toLowerCase();
    const otp = String(rawOtp).trim();
    const session = otpSessions.get(email);

    if (!session || session.otp !== otp) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_OTP", message: "Invalid verification code. Please check and try again." },
      });
    }

    if (Date.now() > session.expiresAt) {
      otpSessions.delete(email);
      return res.status(400).json({
        success: false,
        error: { code: "OTP_EXPIRED", message: "Verification code has expired. Please request a new one." },
      });
    }

    session.verified = true;

    res.json({
      success: true,
      data: {
        verified: true,
        message: "Code verified successfully. Please enter your new password.",
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/forgot-password/reset-password
router.post("/forgot-password/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: rawEmail, otp: rawOtp, newPassword, confirmPassword } = req.body;
    if (!rawEmail || !rawOtp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "All fields are required." },
      });
    }

    const email = String(rawEmail).trim().toLowerCase();
    const otp = String(rawOtp).trim();
    const session = otpSessions.get(email);

    if (!session || session.otp !== otp || !session.verified) {
      return res.status(400).json({
        success: false,
        error: { code: "UNAUTHORIZED_RESET", message: "Session invalid or unverified. Please restart verification." },
      });
    }

    if (Date.now() > session.expiresAt) {
      otpSessions.delete(email);
      return res.status(400).json({
        success: false,
        error: { code: "OTP_EXPIRED", message: "Verification session expired. Please request a new code." },
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: "PASSWORD_MISMATCH", message: "New password and confirmation password do not match." },
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          message: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character.",
        },
      });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User account not found." },
      });
    }

    const newHash = await hashPassword(newPassword);
    await storage.updateUserPassword(user.id, newHash);
    otpSessions.delete(email);

    await mailService.sendPasswordChangedConfirmation(user.email, user.fullName);

    await auditService.record({
      userId: user.id,
      action: "RESET_PASSWORD_VIA_OTP",
      entityName: "User",
      entityId: user.id,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      data: {
        success: true,
        message: "Password reset successfully. You can now sign in with your new password.",
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
