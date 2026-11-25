import { prisma } from "../db";
import { sanitizeAuditPayload } from "../utils/field-mapping";
import { logger } from "../utils/logger";

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  correlationId?: string;
}

export class AuditService {
  async record(params: LogAuditParams): Promise<void> {
    try {
      const sanitizedOld = params.oldValues ? sanitizeAuditPayload(params.oldValues) : null;
      const sanitizedNew = params.newValues ? sanitizeAuditPayload(params.newValues) : null;

      await prisma.auditLog.create({
        data: {
          correlationId: params.correlationId || `rh-audit-${Date.now()}`,
          userId: params.userId || null,
          action: params.action,
          entityName: params.entityName,
          entityId: params.entityId,
          oldValues: sanitizedOld ? JSON.stringify(sanitizedOld) : null,
          newValues: sanitizedNew ? JSON.stringify(sanitizedNew) : null,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      logger.warn("Failed to record audit log:", err);
    }
  }
}

export const auditService = new AuditService();
