import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '@/core';
import { CreateBrandDto } from './dto/brand.dto';
import { CategoryTreeNodeDto, CreateCategoryDto } from './dto/category.dto';
import {
  BatchCreateProductDto,
  CreateProductDto,
} from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@ApiTags('Product Catalog & Taxonomy')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('products')
  @ApiOperation({
    summary: 'List and search master products (Barcode-First search)',
    description:
      'Checks for an exact barcode/productCode match first before falling back to partial text search on product name or SKU.',
  })
  @SwaggerResponse({ status: 200, description: 'Paginated product catalog list.' })
  async findAllProducts(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Get product details and enterprise-wide stock aggregate by ID',
  })
  @SwaggerResponse({ status: 200, description: 'Product details with stock totals.' })
  @SwaggerResponse({ status: 404, description: 'Product not found.' })
  async findProductById(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findById(id);
  }

  @Post('products')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Onboard a new master product into the catalog (ADMIN only)',
  })
  @SwaggerResponse({ status: 201, description: 'Product created.' })
  @SwaggerResponse({
    status: 409,
    description: 'Duplicate SKU (PROD_SKU_EXISTS) or barcode (PROD_BARCODE_EXISTS).',
  })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Post('products/batch')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Batch upsert up to 1,000 products keyed by SKU (ADMIN only)',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Batch upsert summary { totalProcessed, insertedOrUpdated }.',
  })
  async batchUpsertProducts(@Body() dto: BatchCreateProductDto) {
    return this.productService.batchUpsert(dto);
  }

  @Put('products/:id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Update an existing master product (ADMIN only)',
  })
  @SwaggerResponse({ status: 200, description: 'Product updated.' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @Delete('products/:id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Soft-delete a master product by setting isActive = false (ADMIN only)',
  })
  @SwaggerResponse({ status: 200, description: 'Product soft-deleted.' })
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.softDelete(id);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get hierarchical recursive category tree',
    description:
      'Returns all active root categories with recursively populated subCategories arrays.',
  })
  @SwaggerResponse({
    status: 200,
    type: [CategoryTreeNodeDto],
    description: 'Nested category tree.',
  })
  async getCategoriesTree(): Promise<CategoryTreeNodeDto[]> {
    return this.productService.getCategoriesTree();
  }

  @Post('categories')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Create a root or child product category (ADMIN only)',
  })
  @SwaggerResponse({ status: 201, description: 'Category created.' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.productService.createCategory(dto);
  }

  @Get('brands')
  @ApiOperation({
    summary: 'List all active brands sorted alphabetically',
  })
  @SwaggerResponse({ status: 200, description: 'Active brands list.' })
  async getBrands() {
    return this.productService.getBrands();
  }

  @Post('brands')
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Create a new product brand (ADMIN only)',
  })
  @SwaggerResponse({ status: 201, description: 'Brand created.' })
  async createBrand(@Body() dto: CreateBrandDto) {
    return this.productService.createBrand(dto);
  }
}
