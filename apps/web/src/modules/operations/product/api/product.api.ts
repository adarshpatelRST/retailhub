import { apiClient, type PaginatedResponse } from "@/api/client";

export type UnitOfMeasure = "PIECE" | "LITRE" | "KG" | "PACK";

export interface BrandItem {
  id: string;
  brandCode: string;
  name: string;
  manufacturer?: string | null;
  isActive: boolean;
}

export interface CategoryNode {
  id: string;
  categoryCode: string;
  name: string;
  parentCategoryId: string | null;
  level: number;
  productCount?: number;
  subCategories: CategoryNode[];
}

export interface ProductItem {
  id: string;
  sku: string;
  productCode: string;
  name: string;
  description?: string | null;
  brandId: string;
  brandName?: string;
  brandCode?: string;
  categoryId: string;
  categoryName?: string;
  categoryCode?: string;
  unitOfMeasure: UnitOfMeasure;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  totalStockUnits?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateProductDto {
  sku: string;
  productCode: string;
  name: string;
  description?: string;
  brandId: string;
  categoryId: string;
  unitOfMeasure: UnitOfMeasure;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
}

export type UpdateProductDto = Partial<CreateProductDto> & {
  isActive?: boolean;
};

export interface CsvBatchProductRow {
  sku: string;
  productCode: string;
  name: string;
  brandCode: string;
  categoryCode: string;
  unitOfMeasure: UnitOfMeasure;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
}

export interface BatchUploadResult {
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: Array<{
    rowNumber: number;
    sku: string;
    reason: string;
  }>;
}

export const productApi = {
  async getProducts(
    params: ProductQueryParams = {},
  ): Promise<PaginatedResponse<ProductItem>> {
    const response = await apiClient.get<ProductItem[]>("/products", {
      params,
    });
    const raw = response.data as unknown as
      | PaginatedResponse<ProductItem>
      | ProductItem[];

    if ((raw as any)?.items && Array.isArray((raw as any).items)) {
      return raw as PaginatedResponse<ProductItem>;
    }

    if (Array.isArray(raw)) {
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const total = raw.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return {
        items: raw.slice(start, start + limit),
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    }
    return raw;
  },

  async getProductById(id: string): Promise<ProductItem> {
    const response = await apiClient.get<ProductItem>(`/products/${id}`);
    return response.data;
  },

  async createProduct(dto: CreateProductDto): Promise<ProductItem> {
    const response = await apiClient.post<ProductItem>("/products", dto);
    return response.data;
  },

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductItem> {
    const response = await apiClient.put<ProductItem>(`/products/${id}`, dto);
    return response.data;
  },

  async deleteProduct(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiClient.delete<{ id: string; deleted: boolean }>(
      `/products/${id}`,
    );
    return response.data;
  },

  async getCategoriesTree(): Promise<CategoryNode[]> {
    const response = await apiClient.get<CategoryNode[]>("/categories");
    return response.data;
  },

  async getBrands(): Promise<BrandItem[]> {
    const response = await apiClient.get<BrandItem[]>("/brands");
    return response.data;
  },

  async uploadBatchProducts(
    products: CsvBatchProductRow[],
  ): Promise<BatchUploadResult> {
    const response = await apiClient.post<BatchUploadResult>(
      "/products/batch",
      { products },
    );
    return response.data;
  },
};
