import { apiClient, type PaginatedResponse } from "./client";

export interface AuditLogRecord {
  id: string;
  correlationId: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string;
  timestamp: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  storeId?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  regionId?: string | null;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  regionId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  async getAuditLogs(
    params: AuditQueryParams = {},
  ): Promise<PaginatedResponse<AuditLogRecord>> {
    const res = await apiClient.get<any>("/audit", { params });
    const body = res.data;
    const payload = body?.data !== undefined ? body.data : body;

    if (payload?.items && payload?.meta) {
      return payload;
    }
    if (Array.isArray(payload)) {
      return {
        items: payload,
        meta: {
          page: params.page ?? 1,
          limit: params.limit ?? 10,
          total: payload.length,
          totalPages: Math.max(1, Math.ceil(payload.length / (params.limit ?? 10))),
        },
      };
    }
    return {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  async getAuditLogById(id: string): Promise<AuditLogRecord> {
    const res = await apiClient.get<any>(`/audit/${id}`);
    return res.data?.data ?? res.data;
  },
};

