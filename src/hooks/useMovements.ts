import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";

export const MOVEMENT_QUERY_KEYS = {
  ledger: (storeId: string, productId: string, page: number, limit: number) =>
    ["movements", storeId, productId, page, limit] as const,
};

export interface UseMovementsParams {
  storeId: string;
  productId: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useMovements({
  storeId,
  productId,
  page = 1,
  limit = 20,
  enabled = true,
}: UseMovementsParams) {
  return useQuery({
    queryKey: MOVEMENT_QUERY_KEYS.ledger(storeId, productId, page, limit),
    queryFn: () => inventoryApi.getMovements(storeId, productId, page, limit),
    enabled: enabled && Boolean(storeId && productId),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
