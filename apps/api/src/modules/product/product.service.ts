import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brand, Category, Prisma, Product } from '@prisma/client';
import { PaginatedResponse } from '@/core/common/api-response.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateBrandDto } from './dto/brand.dto';
import { CategoryTreeNodeDto, CreateCategoryDto } from './dto/category.dto';
import {
  BatchCreateProductDto,
  CreateProductDto,
} from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export type ProductWithRelations = Product & {
  brand: Brand;
  category: Category;
};

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Onboards a new master Product into the catalog.
   * - Validates unique `sku` (`PROD_SKU_EXISTS`) and `productCode` (`PROD_BARCODE_EXISTS`).
   * - Defaults `mrp` to `sellingPrice` if omitted.
   */
  async create(dto: CreateProductDto): Promise<ProductWithRelations> {
    const normalizedSku = dto.sku.trim().toUpperCase();
    const normalizedBarcode = dto.productCode.trim();

    const [existingSku, existingBarcode, brand, category] = await Promise.all([
      this.prisma.product.findUnique({ where: { sku: normalizedSku } }),
      this.prisma.product.findUnique({
        where: { productCode: normalizedBarcode },
      }),
      this.prisma.brand.findUnique({ where: { id: dto.brandId } }),
      this.prisma.category.findUnique({ where: { id: dto.categoryId } }),
    ]);

    if (existingSku) {
      throw new ConflictException('PROD_SKU_EXISTS');
    }

    if (existingBarcode) {
      throw new ConflictException('PROD_BARCODE_EXISTS');
    }

    if (!brand || !brand.isActive) {
      throw new NotFoundException(
        `Active brand with ID '${dto.brandId}' was not found.`,
      );
    }

    if (!category || !category.isActive) {
      throw new NotFoundException(
        `Active category with ID '${dto.categoryId}' was not found.`,
      );
    }

    const mrpValue = dto.mrp ?? dto.sellingPrice;

    return this.prisma.product.create({
      data: {
        sku: normalizedSku,
        productCode: normalizedBarcode,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        unitOfMeasure: dto.unitOfMeasure.trim().toUpperCase(),
        costPrice: new Prisma.Decimal(dto.costPrice),
        sellingPrice: new Prisma.Decimal(dto.sellingPrice),
        mrp: new Prisma.Decimal(mrpValue),
        isActive: true,
      },
      include: {
        brand: true,
        category: true,
      },
    });
  }

  /**
   * Batch upserts up to 1,000 products per chunk keyed by `sku`.
   */
  async batchUpsert(dto: BatchCreateProductDto): Promise<{
    totalProcessed: number;
    insertedOrUpdated: number;
  }> {
    let insertedOrUpdated = 0;

    for (const row of dto.products) {
      const normalizedSku = row.sku.trim().toUpperCase();
      const normalizedBarcode = row.productCode.trim();
      const mrpValue = row.mrp ?? row.sellingPrice;

      await this.prisma.product.upsert({
        where: { sku: normalizedSku },
        update: {
          productCode: normalizedBarcode,
          name: row.name.trim(),
          description: row.description?.trim() ?? null,
          brandId: row.brandId,
          categoryId: row.categoryId,
          unitOfMeasure: row.unitOfMeasure.trim().toUpperCase(),
          costPrice: new Prisma.Decimal(row.costPrice),
          sellingPrice: new Prisma.Decimal(row.sellingPrice),
          mrp: new Prisma.Decimal(mrpValue),
          isActive: true,
        },
        create: {
          sku: normalizedSku,
          productCode: normalizedBarcode,
          name: row.name.trim(),
          description: row.description?.trim() ?? null,
          brandId: row.brandId,
          categoryId: row.categoryId,
          unitOfMeasure: row.unitOfMeasure.trim().toUpperCase(),
          costPrice: new Prisma.Decimal(row.costPrice),
          sellingPrice: new Prisma.Decimal(row.sellingPrice),
          mrp: new Prisma.Decimal(mrpValue),
          isActive: true,
        },
      });

      insertedOrUpdated += 1;
    }

    return {
      totalProcessed: dto.products.length,
      insertedOrUpdated,
    };
  }

  /**
   * Queries master products with Barcode-First resolution:
   * 1. If `query.search` is provided, checks for an exact `productCode` match first
   *    (supporting handheld physical barcode scanners).
   * 2. If no exact barcode match exists, falls back to partial matching on `name` or `sku`.
   */
  async findAll(
    query: ProductQueryDto,
  ): Promise<PaginatedResponse<ProductWithRelations>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const isActive = query.isActive ?? true;

    const baseFilters: Prisma.ProductWhereInput = {
      isActive,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
    };

    const searchTerm = query.search?.trim();

    if (searchTerm && searchTerm.length > 0) {
      // Step 1: Check for an exact barcode (`productCode`) match first
      const exactBarcodeMatch = await this.prisma.product.findFirst({
        where: {
          ...baseFilters,
          productCode: searchTerm,
        },
        include: {
          brand: true,
          category: true,
        },
      });

      if (exactBarcodeMatch) {
        return new PaginatedResponse<ProductWithRelations>(
          [exactBarcodeMatch],
          1,
          page,
          limit,
        );
      }

      // Step 2: Fallback to partial text search across `name` and `sku`
      const fallbackWhere: Prisma.ProductWhereInput = {
        ...baseFilters,
        OR: [
          { name: { contains: searchTerm } },
          { sku: { contains: searchTerm.toUpperCase() } },
        ],
      };

      const [items, totalItems] = await Promise.all([
        this.prisma.product.findMany({
          where: fallbackWhere,
          include: {
            brand: true,
            category: true,
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.product.count({ where: fallbackWhere }),
      ]);

      return new PaginatedResponse<ProductWithRelations>(
        items,
        totalItems,
        page,
        limit,
      );
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where: baseFilters,
        include: {
          brand: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: baseFilters }),
    ]);

    return new PaginatedResponse<ProductWithRelations>(
      items,
      totalItems,
      page,
      limit,
    );
  }

  /**
   * Retrieves a single Product by UUID along with `brand`, `category`,
   * and enterprise-wide stock aggregate across all stores from `Inventory`.
   */
  async findById(id: string): Promise<
    ProductWithRelations & {
      stockAggregate: {
        totalAvailableQuantity: Prisma.Decimal;
        totalReservedQuantity: Prisma.Decimal;
        totalInTransitQuantity: Prisma.Decimal;
        storeCount: number;
      };
    }
  > {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' was not found.`);
    }

    const inventoryAgg = await this.prisma.inventory.aggregate({
      where: { productId: id },
      _sum: {
        availableQuantity: true,
        reservedQuantity: true,
        inTransitQuantity: true,
      },
      _count: {
        storeId: true,
      },
    });

    return {
      ...product,
      stockAggregate: {
        totalAvailableQuantity:
          inventoryAgg._sum.availableQuantity ?? new Prisma.Decimal(0),
        totalReservedQuantity:
          inventoryAgg._sum.reservedQuantity ?? new Prisma.Decimal(0),
        totalInTransitQuantity:
          inventoryAgg._sum.inTransitQuantity ?? new Prisma.Decimal(0),
        storeCount: inventoryAgg._count.storeId ?? 0,
      },
    };
  }

  /**
   * Updates an existing Product record and validates SKU/Barcode uniqueness if modified.
   */
  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductWithRelations> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' was not found.`);
    }

    if (dto.sku && dto.sku.trim().toUpperCase() !== existing.sku) {
      const duplicateSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku.trim().toUpperCase() },
      });
      if (duplicateSku && duplicateSku.id !== id) {
        throw new ConflictException('PROD_SKU_EXISTS');
      }
    }

    if (dto.productCode && dto.productCode.trim() !== existing.productCode) {
      const duplicateBarcode = await this.prisma.product.findUnique({
        where: { productCode: dto.productCode.trim() },
      });
      if (duplicateBarcode && duplicateBarcode.id !== id) {
        throw new ConflictException('PROD_BARCODE_EXISTS');
      }
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...(dto.sku !== undefined ? { sku: dto.sku.trim().toUpperCase() } : {}),
      ...(dto.productCode !== undefined
        ? { productCode: dto.productCode.trim() }
        : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() ?? null }
        : {}),
      ...(dto.brandId !== undefined
        ? { brand: { connect: { id: dto.brandId } } }
        : {}),
      ...(dto.categoryId !== undefined
        ? { category: { connect: { id: dto.categoryId } } }
        : {}),
      ...(dto.unitOfMeasure !== undefined
        ? { unitOfMeasure: dto.unitOfMeasure.trim().toUpperCase() }
        : {}),
      ...(dto.costPrice !== undefined
        ? { costPrice: new Prisma.Decimal(dto.costPrice) }
        : {}),
      ...(dto.sellingPrice !== undefined
        ? { sellingPrice: new Prisma.Decimal(dto.sellingPrice) }
        : {}),
      ...(dto.mrp !== undefined
        ? { mrp: new Prisma.Decimal(dto.mrp) }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
        category: true,
      },
    });
  }

  /**
   * Soft-deletes a Product by setting `isActive = false` (preserves historical POS and transfer lines).
   */
  async softDelete(id: string): Promise<Product> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' was not found.`);
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Queries all active categories and constructs a pre-structured recursive tree
   * where root categories contain nested `subCategories: []`.
   */
  async getCategoriesTree(): Promise<CategoryTreeNodeDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const nodeMap = new Map<string, CategoryTreeNodeDto>();
    const roots: CategoryTreeNodeDto[] = [];

    for (const cat of categories) {
      nodeMap.set(cat.id, {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        parentCategoryId: cat.parentCategoryId,
        isActive: cat.isActive,
        createdAt: cat.createdAt,
        subCategories: [],
      });
    }

    for (const cat of categories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parentCategoryId && nodeMap.has(cat.parentCategoryId)) {
        nodeMap.get(cat.parentCategoryId)!.subCategories.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Creates a new Category after validating unique `code` and optional `parentCategoryId`.
   */
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existingCode = await this.prisma.category.findUnique({
      where: { code: normalizedCode },
    });

    if (existingCode) {
      throw new ConflictException('CATEGORY_CODE_EXISTS');
    }

    if (dto.parentCategoryId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentCategoryId },
      });
      if (!parent || !parent.isActive) {
        throw new NotFoundException(
          `Parent category with ID '${dto.parentCategoryId}' was not found.`,
        );
      }
    }

    return this.prisma.category.create({
      data: {
        code: normalizedCode,
        name: dto.name.trim(),
        parentCategoryId: dto.parentCategoryId ?? null,
        isActive: true,
      },
    });
  }

  /**
   * Returns all active Brands sorted alphabetically by name.
   */
  async getBrands(): Promise<Brand[]> {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a new Brand after verifying unique `code`.
   */
  async createBrand(dto: CreateBrandDto): Promise<Brand> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.brand.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new ConflictException('BRAND_CODE_EXISTS');
    }

    return this.prisma.brand.create({
      data: {
        code: normalizedCode,
        name: dto.name.trim(),
        isActive: true,
      },
    });
  }
}
