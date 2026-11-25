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
}

export type UpdateStoreDto = Partial<CreateStoreDto> & {
  isActive?: boolean;
};

export const storeApi = {
  async getStores(params: StoreQueryParams = {}): Promise<StoreDirectoryItem[]> {
    const response = await apiClient.get<StoreDirectoryItem[]>("/stores", {
      params,
    });
    const raw = response.data as unknown as
      | StoreDirectoryItem[]
      | { items: StoreDirectoryItem[] };

    if (Array.isArray(raw)) {
      return raw;
    }
    return raw.items ?? [];
  },

  async getStoreNetworkDirectory(): Promise<StoreDirectoryItem[]> {
    const response = await apiClient.get<StoreDirectoryItem[]>(
      "/stores/network-directory",
    );
    return response.data;
  },

  async createStore(dto: CreateStoreDto): Promise<StoreDirectoryItem> {
    const response = await apiClient.post<StoreDirectoryItem>("/stores", dto);
    return response.data;
  },

  async updateStore(
    id: string,
    dto: UpdateStoreDto,
  ): Promise<StoreDirectoryItem> {
    const response = await apiClient.put<StoreDirectoryItem>(
      `/stores/${id}`,
      dto,
    );
    return response.data;
  },

  async getRegions(): Promise<RegionItem[]> {
    const response = await apiClient.get<RegionItem[]>("/regions");
    return response.data;
  },
};
