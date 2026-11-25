import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  inventoryApi,
  type TransferQueryParams,
  type ReceiveTransferDto,
} from "../api/inventory.api";
import { INVENTORY_QUERY_KEYS } from "./useInventory";

export const TRANSFER_QUERY_KEYS = {
  all: ["transfers"] as const,
  list: (params: TransferQueryParams) =>
    ["transfers", "list", params] as const,
};

export function useTransfers(params: TransferQueryParams = {}) {
  return useQuery({
    queryKey: TRANSFER_QUERY_KEYS.list(params),
    queryFn: () => inventoryApi.getTransfers(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

export function useReceiveTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReceiveTransferDto }) =>
      inventoryApi.receiveTransfer(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSFER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all });
    },
  });
}
