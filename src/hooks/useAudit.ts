import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditApi, type AuditQueryParams } from "@/api/audit.api";

export function useAuditLogs(params: AuditQueryParams = {}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => auditApi.getAuditLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useAuditLogDetail(id: string | null) {
  return useQuery({
    queryKey: ["audit-log-detail", id],
    queryFn: () => (id ? auditApi.getAuditLogById(id) : null),
    enabled: Boolean(id),
  });
}

