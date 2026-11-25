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

export interface CategoryFlatItem {
  id: string;
  code: string;
  name: string;
  parentCategoryId: string | null;
  parentName: string | null;
  parentCode: string | null;
  productCount: number;
  subCategoryCount: number;
  isLeaf: boolean;
  isActive: boolean;
  createdAt: string;
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
  isActive?: boolean;
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
    const response = await apiClient.get<any>("/products", {
      params,
    });
    const body: any = response.data;
    const actual = body?.data !== undefined ? body.data : body;

    if (actual?.items && Array.isArray(actual.items)) {
      return actual;
    }

    if (Array.isArray(actual)) {
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const total = actual.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return {
        items: actual.slice(start, start + limit),
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    }

    return {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  async getProductById(id: string): Promise<ProductItem> {
    const response = await apiClient.get<any>(`/products/${id}`);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async createProduct(dto: CreateProductDto): Promise<ProductItem> {
    const response = await apiClient.post<any>("/products", dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductItem> {
    const response = await apiClient.put<any>(`/products/${id}`, dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async deleteProduct(id: string): Promise<{ id: string; deleted: boolean }> {
    const response = await apiClient.delete<any>(`/products/${id}`);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async getCategoriesTree(): Promise<CategoryNode[]> {
    const response = await apiClient.get<any>("/categories");
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async getBrands(): Promise<BrandItem[]> {
    const response = await apiClient.get<any>("/brands");
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async uploadBatchProducts(
    products: CsvBatchProductRow[],
  ): Promise<BatchUploadResult> {
    const response = await apiClient.post<any>(
      "/products/batch",
      { products },
    );
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async getCategoriesFlat(): Promise<CategoryFlatItem[]> {
    const response = await apiClient.get<any>("/categories/flat");
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async createCategory(dto: {
    code: string;
    name: string;
    parentCategoryId?: string | null;
  }): Promise<any> {
    const response = await apiClient.post<any>("/categories", dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async updateCategory(
    id: string,
    dto: { name?: string; parentCategoryId?: string | null; isActive?: boolean },
  ): Promise<any> {
    const response = await apiClient.put<any>(`/categories/${id}`, dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async deleteCategory(id: string): Promise<any> {
    const response = await apiClient.delete<any>(`/categories/${id}`);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async createBrand(dto: { code: string; name: string }): Promise<any> {
    const response = await apiClient.post<any>("/brands", dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async updateBrand(
    id: string,
    dto: { name?: string; isActive?: boolean },
  ): Promise<any> {
    const response = await apiClient.put<any>(`/brands/${id}`, dto);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },

  async deleteBrand(id: string): Promise<any> {
    const response = await apiClient.delete<any>(`/brands/${id}`);
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
};
