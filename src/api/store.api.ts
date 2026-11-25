import { apiClient } from "@/api/client";

export type StoreFormat = "HYPERMARKET" | "SUPERMARKET" | "EXPRESS";

export interface RegionItem {
  id: string;
  regionCode: string;
  name: string;
  zoneName?: string;
}

export interface StoreTypeItem {
  id: string;
  code: StoreFormat;
  name: string;
}

export interface StoreDirectoryItem {
  id: string;
  storeCode: string;
  name: string;
  regionId: string;
  region?: {
    id: string;
    regionCode?: string;
    name: string;
  };
  storeTypeId?: string;
  storeFormat: StoreFormat;
  city: string;
  state?: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  openingDate?: string | null;
  managerName?: string | null;
  contactPhone?: string | null;
  isActive: boolean;
}

export interface StoreQueryParams {
  regionId?: string;
  storeFormat?: StoreFormat;
  search?: string;
  isActive?: boolean;
}

export interface CreateStoreDto {
  storeCode: string;
  name: string;
  regionId: string;
  storeTypeId: string;
  city: string;
  address: string;
  openingDate: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export type UpdateStoreDto = Partial<CreateStoreDto> & {
  isActive?: boolean;
};

export const storeApi = {
  async getStores(params: StoreQueryParams = {}): Promise<StoreDirectoryItem[]> {
    const response = await apiClient.get<any>("/stores", {
      params,
    });
    const payload = response.data?.data !== undefined ? response.data.data : response.data;

    if (Array.isArray(payload)) {
      return payload;
    }
    return payload?.items ?? [];
  },

  async getStoreNetworkDirectory(): Promise<StoreDirectoryItem[]> {
    const response = await apiClient.get<any>("/stores/network-directory");
    const payload = response.data?.data !== undefined ? response.data.data : response.data;
    return Array.isArray(payload) ? payload : [];
  },

  async createStore(dto: CreateStoreDto): Promise<StoreDirectoryItem> {
    const response = await apiClient.post<any>("/stores", dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async updateStore(
    id: string,
    dto: UpdateStoreDto,
  ): Promise<StoreDirectoryItem> {
    const response = await apiClient.put<any>(`/stores/${id}`, dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async getRegions(): Promise<RegionItem[]> {
    const response = await apiClient.get<any>("/regions");
    const payload = response.data?.data !== undefined ? response.data.data : response.data;
    return Array.isArray(payload) ? payload : [];
  },
};
