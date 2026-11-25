import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as argon2 from "argon2";
import { config } from "./config";
import { prisma } from "./db";
import { UnauthorizedError, ForbiddenError } from "./utils/errors";
import { UserRole } from "../shared/schema";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedStoreIds: string[];
  assignedRegionIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      correlationId?: string;
    }
  }
}

export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText);
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

export function signJwt(payload: Record<string, any>): string {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn as any,
  });
}

export function verifyJwt(token: string): any {
  return jwt.verify(token, config.auth.jwtSecret);
}

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new UnauthorizedError("Authentication token is required"));
  }

  // Support demo persona tokens (used by Persona Switcher in dev/testing)
  if (token.startsWith("demo-jwt-")) {
    const roleSlug = token.replace("demo-jwt-", "").toUpperCase();
    const emailByRole: Record<string, string> = {
      ADMIN: "admin@retailhub.com",
      EXECUTIVE: "executive@retailhub.com",
      REGIONAL_MANAGER: "regional.central@retailhub.com",
      STORE_MANAGER: "store.bhopal@retailhub.com",
    };
    const targetEmail = emailByRole[roleSlug] || "admin@retailhub.com";
    const user = await prisma.user.findFirst({
      where: { email: targetEmail },
      include: {
        storeAssignments: true,
        regionAssignments: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as UserRole,
        assignedStoreIds: user.storeAssignments.map((a) => a.storeId),
        assignedRegionIds: user.regionAssignments.map((a) => a.regionId),
      };
      return next();
    }
  }

  try {
    const decoded = verifyJwt(token);
    const userId = decoded.sub || decoded.userId || decoded.id;

    if (!userId) {
      return next(new UnauthorizedError("Invalid token payload"));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeAssignments: true,
        regionAssignments: true,
      },
    });

    if (!user) {
      return next(new UnauthorizedError("User account no longer exists"));
    }

    if (!user.isActive) {
      return next(new ForbiddenError("Account has been deactivated by an Administrator"));
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      assignedStoreIds: user.storeAssignments.map((a) => a.storeId),
      assignedRegionIds: user.regionAssignments.map((a) => a.regionId),
    };

    next();
  } catch (err) {
    next(new UnauthorizedError("Invalid or expired authentication token"));
  }
}
