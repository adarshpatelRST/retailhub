import { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  productApi,
  type ProductQueryParams,
  type CreateProductDto,
  type UpdateProductDto,
} from "../api/product.api";

export const PRODUCT_QUERY_KEYS = {
  all: ["products"] as const,
  list: (params: ProductQueryParams) => ["products", "list", params] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  brands: ["products", "brands"] as const,
};

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useProducts(params: ProductQueryParams) {
  const debouncedSearch = useDebouncedValue(params.search ?? "", 300);

  const normalizedParams: ProductQueryParams = {
    ...params,
    search: debouncedSearch.trim() || undefined,
  };

  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.list(normalizedParams),
    queryFn: () => productApi.getProducts(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useProductDetail(productId: string | null) {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(productId ?? ""),
    queryFn: () => productApi.getProductById(productId!),
    enabled: Boolean(productId),
    staleTime: 30_000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.brands,
    queryFn: () => productApi.getBrands(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateProductDto) => productApi.createProduct(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) =>
      productApi.updateProduct(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: PRODUCT_QUERY_KEYS.detail(variables.id),
      });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
}
