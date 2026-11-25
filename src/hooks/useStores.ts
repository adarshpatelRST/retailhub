import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  storeApi,
  type StoreQueryParams,
  type CreateStoreDto,
  type UpdateStoreDto,
  type StoreDirectoryItem,
} from "../api/store.api";

export const STORE_QUERY_KEYS = {
  all: ["stores"] as const,
  list: (params: StoreQueryParams) => ["stores", "list", params] as const,
  networkDirectory: ["stores", "network-directory"] as const,
  regions: ["stores", "regions"] as const,
};

export function groupStoresByRegion(
  stores: StoreDirectoryItem[],
): Array<{ regionId: string; regionName: string; stores: StoreDirectoryItem[] }> {
  const map = new Map<
    string,
    { regionId: string; regionName: string; stores: StoreDirectoryItem[] }
  >();

  for (const store of stores) {
    const regionId = store.region?.id ?? store.regionId ?? "unassigned";
    const regionName = store.region?.name ?? "Regional Zone";

    const existing = map.get(regionId);
    if (existing) {
      existing.stores.push(store);
    } else {
      map.set(regionId, {
        regionId,
        regionName,
        stores: [store],
      });
    }
  }

  return Array.from(map.values());
}

export function useStores(params: StoreQueryParams = {}) {
  const query = useQuery({
    queryKey: STORE_QUERY_KEYS.list(params),
    queryFn: () => storeApi.getStores(params),
    staleTime: 60_000,
  });

  const groupedByRegion = useMemo(
    () => groupStoresByRegion(query.data ?? []),
    [query.data],
  );

  return {
    ...query,
    stores: query.data ?? [],
    groupedByRegion,
  };
}

export function useStoreNetworkDirectory(enabled = true) {
  return useQuery({
    queryKey: STORE_QUERY_KEYS.networkDirectory,
    queryFn: () => storeApi.getStoreNetworkDirectory(),
    enabled,
    staleTime: 60_000,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: STORE_QUERY_KEYS.regions,
    queryFn: () => storeApi.getRegions(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateStoreDto) => storeApi.createStore(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.all });
    },
  });
}

export function useUpdateStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateStoreDto }) =>
      storeApi.updateStore(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.all });
    },
  });
}
