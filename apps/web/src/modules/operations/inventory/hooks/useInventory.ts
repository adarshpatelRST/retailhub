import { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  inventoryApi,
  type InventoryQueryParams,
  type AdjustStockDto,
} from "../api/inventory.api";

export const INVENTORY_QUERY_KEYS = {
  all: ["inventory"] as const,
  list: (params: InventoryQueryParams) =>
    ["inventory", "list", params] as const,
  balance: (storeId: string, productId: string) =>
    ["inventory", "balance", storeId, productId] as const,
};

function useDebouncedSearch(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useInventory(params: InventoryQueryParams) {
  const debouncedSearch = useDebouncedSearch(params.search ?? "", 300);

  const normalizedParams: InventoryQueryParams = {
    ...params,
    search: debouncedSearch.trim() || undefined,
  };

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.list(normalizedParams),
    queryFn: () => inventoryApi.getInventory(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export function useInventoryBalance(
  storeId: string | null,
  productId: string | null,
) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.balance(storeId ?? "", productId ?? ""),
    queryFn: () => inventoryApi.getInventoryBalance(storeId!, productId!),
    enabled: Boolean(storeId && productId),
    staleTime: 15_000,
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AdjustStockDto) => inventoryApi.adjustStock(dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: INVENTORY_QUERY_KEYS.balance(
          variables.storeId,
          variables.productId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: ["movements", variables.storeId, variables.productId],
      });
    },
  });
}
