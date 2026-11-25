import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { auditService } from "../services/audit-service";

const RESOURCE_TO_MODEL_MAP: Record<string, string> = {
  categories: "Category",
  category: "Category",
  brands: "Brand",
  brand: "Brand",
  users: "User",
  user: "User",
  products: "Product",
  product: "Product",
  inventory: "Inventory",
  transfers: "StockTransfer",
  transfer: "StockTransfer",
  stores: "Store",
  store: "Store",
  rules: "InventoryRule",
  rule: "InventoryRule",
  sales: "SalesTransaction",
  sale: "SalesTransaction",
  recommendations: "Recommendation",
  intelligence: "Recommendation",
  auth: "User",
  roles: "Role",
};

function parsePathInfo(urlPath: string): { resource: string; entityIdFromPath?: string } {
  const cleanPath = urlPath.split("?")[0].replace(/^\/api\/v\d+\//, "").replace(/^\//, "");
  const parts = cleanPath.split("/").filter(Boolean);
  const resource = parts[0] || "Resource";
  let entityIdFromPath: string | undefined = undefined;
  if (
    parts.length > 1 &&
    !["status", "reset-password", "change-password", "bulk", "adjust", "approve", "receive", "tree"].includes(parts[1])
  ) {
    entityIdFromPath = parts[1];
  }
  return { resource, entityIdFromPath };
}

function determineBusinessAction(method: string, urlPath: string, customAction?: string): string {
  if (customAction) return customAction;

  const cleanPath = urlPath.split("?")[0].replace(/^\/api\/v\d+\//, "/").toLowerCase();

  // Categories
  if (cleanPath.startsWith("/categories")) {
    if (method === "POST") return "CREATE_CATEGORY";
    if (method === "PUT" || method === "PATCH") return "UPDATE_CATEGORY";
    if (method === "DELETE") return "SOFT_DELETE_CATEGORY";
  }

  // Brands
  if (cleanPath.startsWith("/brands")) {
    if (method === "POST") return "CREATE_BRAND";
    if (method === "PUT" || method === "PATCH") return "UPDATE_BRAND";
    if (method === "DELETE") return "SOFT_DELETE_BRAND";
  }

  // Users & Auth
  if (cleanPath.includes("/reset-password")) return "RESET_EMPLOYEE_PASSWORD";
  if (cleanPath.includes("/change-password")) return "CHANGE_PASSWORD";
  if (cleanPath.includes("/status") && cleanPath.startsWith("/users")) return "UPDATE_USER_STATUS";
  if (cleanPath.startsWith("/users")) {
    if (method === "POST") return "CREATE_USER";
    if (method === "PUT" || method === "PATCH") return "UPDATE_USER";
    if (method === "DELETE") return "DELETE_USER";
  }

  // Inventory & Transfers
  if (cleanPath.includes("/transfers") && cleanPath.includes("/approve")) return "TRANSFER_APPROVE";
  if (cleanPath.includes("/transfers") && cleanPath.includes("/receive")) return "TRANSFER_RECEIVE";
  if (cleanPath.startsWith("/transfers")) {
    if (method === "POST") return "CREATE_TRANSFER";
    if (method === "PUT" || method === "PATCH") return "UPDATE_TRANSFER";
  }
  if (cleanPath.includes("/inventory/adjust") || cleanPath.includes("/stock")) return "ADJUST_STOCK";

  // Products
  if (cleanPath.includes("/products/bulk")) return "BULK_SKU_IMPORT";
  if (cleanPath.startsWith("/products")) {
    if (method === "POST") return "CREATE_PRODUCT";
    if (method === "PUT" || method === "PATCH") return "UPDATE_PRODUCT";
    if (method === "DELETE") return "DELETE_PRODUCT";
  }

  // Stores
  if (cleanPath.startsWith("/stores")) {
    if (method === "POST") return "CREATE_STORE";
    if (method === "PUT" || method === "PATCH") return "UPDATE_STORE";
  }

  // Recommendations / Action Center & AI Intelligence
  if (
    cleanPath.includes("/recommendations") ||
    cleanPath.includes("/intelligence") ||
    cleanPath.includes("/actions")
  ) {
    if (cleanPath.includes("/batch-reject")) return "BATCH_REJECT_RECOMMENDATIONS";
    if (cleanPath.includes("/batch-approve")) return "BATCH_APPROVE_RECOMMENDATIONS";
    if (cleanPath.includes("/reject")) return "REJECT_RECOMMENDATION";
    if (cleanPath.includes("/approve")) return "APPROVE_RECOMMENDATION";
    if (cleanPath.includes("/modify")) return "MODIFY_RECOMMENDATION";
    if (cleanPath.includes("/model-config")) return "SWITCH_AI_MODEL";
  }

  const parts = cleanPath.replace(/^\//, "").split("/");
  const resName = parts[0] ? parts[0].toUpperCase() : "RESOURCE";
  return `${method}_${resName}`;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers["x-correlation-id"] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);

  // Capture response body on json send to capture created entity IDs
  let responseData: any = null;
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    responseData = body;
    return originalJson(body);
  };

  // Capture response finish to log mutating operations (POST, PUT, PATCH, DELETE)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400 && req.user) {
        const fullUrl = req.originalUrl || req.baseUrl || req.path;
        const { resource, entityIdFromPath } = parsePathInfo(fullUrl);

        // Normalize entity / model name (avoids technical "v1" or raw path)
        const entityName = RESOURCE_TO_MODEL_MAP[resource.toLowerCase()] || resource || "Resource";

        // Determine Entity ID
        let resolvedEntityId =
          (req as any).auditEntityId ||
          responseData?.data?.id ||
          responseData?.data?.code ||
          responseData?.id ||
          responseData?.code ||
          entityIdFromPath ||
          req.params?.id;

        if (!resolvedEntityId) {
          resolvedEntityId = "batch";
        }

        const action = determineBusinessAction(req.method, fullUrl, (req as any).auditAction);

        // Capture Old and New Values
        const oldValues = (req as any).auditOldValues ?? undefined;
        const newValues = (req as any).auditNewValues ?? req.body;

        auditService.record({
          correlationId,
          userId: req.user.id,
          action,
          entityName,
          entityId: String(resolvedEntityId),
          oldValues,
          newValues,
          ipAddress: req.ip,
        });
      }
    });
  }

  next();
}
