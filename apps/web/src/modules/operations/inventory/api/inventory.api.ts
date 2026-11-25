import { apiClient, type PaginatedResponse } from "@/api/client";

export type InventoryStockStatus = "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS";
export type DoiRiskTier = "HIGH" | "MEDIUM" | "LOW";

export type MovementType =
  | "POS_SALE"
  | "INWARD_RECEIPT"
  | "TRANSFER_OUT_DISPATCH"
  | "TRANSFER_IN_RECEIPT"
  | "DAMAGED_WRITE_OFF"
  | "STOCK_ADJUSTMENT";

export type TransferStatus =
  | "DRAFT"
  | "APPROVED_IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export interface InventoryRecord {
  id: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  productId: string;
  sku: string;
  productCode: string;
  productName: string;
  unitOfMeasure: "PIECE" | "LITRE" | "KG" | "PACK";
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
  averageDailySales: number;
  daysOfInventory: number;
  status: InventoryStockStatus;
  riskTier: DoiRiskTier;
  version: number;
  lastUpdatedOn: string;
}

export interface InventoryQueryParams {
  storeId?: string;
  status?: InventoryStockStatus | "ALL";
  risk?: DoiRiskTier | "ALL";
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface MovementLedgerEntry {
  id: string;
  storeId: string;
  productId: string;
  movementType: MovementType;
  quantityDelta: number;
  balanceAfter: number;
  referenceNumber: string;
  actorName: string;
  remarks?: string | null;
  createdAt: string;
}

export interface AdjustStockDto {
  storeId: string;
  productId: string;
  quantityDelta: number;
  remarks: string;
  expectedVersion: number;
}

export interface TransferLineItem {
  id: string;
  productId: string;
  sku: string;
  productCode: string;
  productName: string;
  unitOfMeasure: "PIECE" | "LITRE" | "KG" | "PACK";
  requestedQty: number;
  shippedQty: number;
  receivedQty?: number | null;
}

export interface TransferShipmentRecord {
  id: string;
  transferNumber: string;
  sourceStoreId: string;
  sourceStoreCode: string;
  sourceStoreName: string;
  destinationStoreId: string;
  destinationStoreCode: string;
  destinationStoreName: string;
  status: TransferStatus;
  shippedDate: string;
  completedDate?: string | null;
  carrierName: string;
  vehicleNumber: string;
  driverPhone?: string | null;
  lines: TransferLineItem[];
}

export interface TransferQueryParams {
  storeId?: string;
  status?: TransferStatus | "INCOMING" | "COMPLETED";
  page?: number;
  limit?: number;
}

export interface ReceiveTransferLineDto {
  productId: string;
  receivedQty: number;
  shortfallReason?: string;
}

export interface ReceiveTransferDto {
  lines: ReceiveTransferLineDto[];
  remarks?: string;
}

export const inventoryApi = {
  async getInventory(
    params: InventoryQueryParams = {},
  ): Promise<PaginatedResponse<InventoryRecord>> {
    const cleanParams = {
      ...params,
      status: params.status === "ALL" ? undefined : params.status,
      risk: params.risk === "ALL" ? undefined : params.risk,
    };
    const response = await apiClient.get<any>("/inventory", {
      params: cleanParams,
    });
    const body = response.data;
    const payload = body?.data !== undefined ? body.data : body;

    if (Array.isArray(payload)) {
      return {
        items: payload,
        meta: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          total: payload.length,
          totalPages: Math.max(1, Math.ceil(payload.length / (params.limit ?? 20))),
        },
      };
    }

    if (payload && Array.isArray(payload.items)) {
      return {
        items: payload.items,
        meta: payload.meta ?? {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          total: payload.items.length,
          totalPages: Math.max(1, Math.ceil(payload.items.length / (params.limit ?? 20))),
        },
      };
    }

    return {
      items: [],
      meta: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        total: 0,
        totalPages: 1,
      },
    };
  },

  async getInventoryBalance(
    storeId: string,
    productId: string,
  ): Promise<InventoryRecord> {
    const response = await apiClient.get<any>(
      `/inventory/${storeId}/${productId}`,
    );
    return response.data?.data ?? response.data;
  },

  async getMovements(
    storeId: string,
    productId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<MovementLedgerEntry>> {
    const response = await apiClient.get<any>(
      `/inventory/${storeId}/${productId}/movements`,
      { params: { page, limit } },
    );
    const body = response.data;
    const payload = body?.data !== undefined ? body.data : body;

    if (Array.isArray(payload)) {
      return {
        items: payload,
        meta: {
          page,
          limit,
          total: payload.length,
          totalPages: Math.max(1, Math.ceil(payload.length / limit)),
        },
      };
    }
    if (payload && Array.isArray(payload.items)) {
      return {
        items: payload.items,
        meta: payload.meta ?? {
          page,
          limit,
          total: payload.items.length,
          totalPages: Math.max(1, Math.ceil(payload.items.length / limit)),
        },
      };
    }
    return {
      items: [],
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 1,
      },
    };
  },

  async adjustStock(dto: AdjustStockDto): Promise<InventoryRecord> {
    const response = await apiClient.post<any>(
      "/inventory/adjust",
      dto,
    );
    return response.data?.data ?? response.data;
  },

  async getTransfers(
    params: TransferQueryParams = {},
  ): Promise<PaginatedResponse<TransferShipmentRecord>> {
    const response = await apiClient.get<TransferShipmentRecord[]>(
      "/transfers",
      { params },
    );
    const raw = response.data as unknown as
      | PaginatedResponse<TransferShipmentRecord>
      | TransferShipmentRecord[];

    if (Array.isArray(raw)) {
      return {
        items: raw,
        meta: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          total: raw.length,
          totalPages: Math.max(1, Math.ceil(raw.length / (params.limit ?? 20))),
        },
      };
    }
    return raw;
  },

  async receiveTransfer(
    id: string,
    dto: ReceiveTransferDto,
  ): Promise<TransferShipmentRecord> {
    const response = await apiClient.post<TransferShipmentRecord>(
      `/transfers/${id}/receive`,
      dto,
    );
    return response.data;
  },
};
