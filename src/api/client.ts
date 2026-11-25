import { api, generateCorrelationId } from "@/lib/api";
import type { ApiResponseEnvelope, ApiErrorEnvelope } from "../../shared/schema";

export const apiClient = api;
export { api, generateCorrelationId };

export type ApiEnvelope<T> = ApiResponseEnvelope<T>;
export type { ApiResponseEnvelope, ApiErrorEnvelope };

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalItems?: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

export type PaginatedList<T> = PaginatedResponse<T>;

export default apiClient;
