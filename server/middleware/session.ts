import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/errors";
import { prisma } from "../db";

export async function dataScopeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const user = req.user;
  if (!user) return next();

  // If user is a STORE_MANAGER, enforce query parameter or body storeId matches assigned stores
  if (user.role === "STORE_MANAGER") {
    const requestedStoreId =
      (req.query.storeId as string) || req.body?.storeId || req.params.storeId;

    if (requestedStoreId && !user.assignedStoreIds.includes(requestedStoreId)) {
      let isAllowed = false;

      try {
        const codeMatch = requestedStoreId.match(/(?:store-)?([a-zA-Z]{3}-\d{2,3})/i);
        const targetCode = codeMatch ? codeMatch[1].toUpperCase() : requestedStoreId.toUpperCase();

        const store = await prisma.store.findFirst({
          where: {
            OR: [
              { id: requestedStoreId },
              { storeCode: targetCode },
            ],
          },
          select: { id: true, storeCode: true },
        });

        if (store && user.assignedStoreIds.includes(store.id)) {
          isAllowed = true;
          // Normalize query param to the actual database store UUID
          if (req.query.storeId) {
            req.query.storeId = store.id;
          }
        }
      } catch {
        // Fallback to strict check
      }

      if (!isAllowed) {
        return next(
          new ForbiddenError(
            `Store Manager is strictly scoped to assigned store (${user.assignedStoreIds.join(
              ", ",
            )}). Access denied to store ${requestedStoreId}`,
          ),
        );
      }
    }

    // Default storeId to assigned store if omitted
    if (!req.query.storeId && user.assignedStoreIds.length > 0) {
      req.query.storeId = user.assignedStoreIds[0];
    }
  }

  next();
}
