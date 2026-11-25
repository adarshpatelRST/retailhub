import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Region, RoleType, Store, StoreType } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { StoreScopedFilter } from '@/core/security/data-scope.decorator';
import { CreateStoreDto } from './dto/create-store.dto';
import {
  CreateRegionDto,
  StoreNetworkDirectoryItemDto,
} from './dto/region.dto';
import { StoreQueryDto } from './dto/store-query.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

export type StoreWithRelations = Store & {
  region: Region;
  storeType: StoreType;
};

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Store record after verifying unique `storeCode`,
   * valid `regionId`, and valid `storeTypeId`.
   */
  async create(dto: CreateStoreDto): Promise<StoreWithRelations> {
    const normalizedCode = dto.storeCode.trim().toUpperCase();

    const [existingStore, region, storeType] = await Promise.all([
      this.prisma.store.findUnique({ where: { storeCode: normalizedCode } }),
      this.prisma.region.findUnique({ where: { id: dto.regionId } }),
      this.prisma.storeType.findUnique({ where: { id: dto.storeTypeId } }),
    ]);

    if (existingStore) {
      throw new ConflictException('STORE_CODE_EXISTS');
    }

    if (!region || !region.isActive) {
      throw new NotFoundException(
        `Active region with ID '${dto.regionId}' was not found.`,
      );
    }

    if (!storeType) {
      throw new NotFoundException(
        `StoreType with ID '${dto.storeTypeId}' was not found.`,
      );
    }

    return this.prisma.store.create({
      data: {
        storeCode: normalizedCode,
        name: dto.name.trim(),
        regionId: dto.regionId,
        storeTypeId: dto.storeTypeId,
        city: dto.city.trim(),
        address: dto.address?.trim() ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        openingDate: new Date(dto.openingDate),
        isActive: true,
      },
      include: {
        region: true,
        storeType: true,
      },
    });
  }

  /**
   * Queries stores merging client `StoreQueryDto` filters with server-side `dataScope`
   * constraints (`STORE_MANAGER` scoped to assigned store IDs; `REGIONAL_MANAGER` scoped
   * to assigned region IDs; `EXECUTIVE` and `ADMIN` unrestricted).
   */
  async findAll(
    query: StoreQueryDto,
    dataScope?: StoreScopedFilter,
  ): Promise<StoreWithRelations[]> {
    const where: Prisma.StoreWhereInput = {
      isActive: query.isActive ?? true,
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(query.storeTypeId ? { storeTypeId: query.storeTypeId } : {}),
      ...(query.city ? { city: { contains: query.city.trim() } } : {}),
    };

    if (dataScope) {
      // Normalize both @DataScope('store') ({ id, regionId }) and default @DataScope() ({ storeId, store.regionId })
      const scopedStoreIds = dataScope.id?.in ?? dataScope.storeId?.in;
      const scopedRegionIds =
        dataScope.regionId?.in ?? dataScope.store?.regionId?.in;

      if (scopedStoreIds) {
        where.id = { in: scopedStoreIds };
      }

      if (scopedRegionIds) {
        if (query.regionId) {
          const allowed = scopedRegionIds.includes(query.regionId)
            ? [query.regionId]
            : [];
          where.regionId = { in: allowed };
        } else {
          where.regionId = { in: scopedRegionIds };
        }
      }
    }

    return this.prisma.store.findMany({
      where,
      include: {
        region: true,
        storeType: true,
      },
      orderBy: [{ region: { name: 'asc' } }, { storeCode: 'asc' }],
    });
  }

  /**
   * Returns a lightweight peer store network directory (`id`, `storeCode`, `name`, `city`,
   * `address`, `latitude`, `longitude`, and contact info of assigned store managers)
   * without exposing any sales revenue or inventory valuation metrics.
   */
  async getNetworkDirectory(
    regionId?: string,
  ): Promise<StoreNetworkDirectoryItemDto[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        isActive: true,
        ...(regionId ? { regionId } : {}),
      },
      select: {
        id: true,
        storeCode: true,
        name: true,
        city: true,
        address: true,
        latitude: true,
        longitude: true,
        region: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        storeType: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        userAssignments: {
          where: {
            user: {
              isActive: true,
              role: RoleType.STORE_MANAGER,
            },
          },
          select: {
            user: {
              select: {
                fullName: true,
                email: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
      orderBy: [{ city: 'asc' }, { storeCode: 'asc' }],
    });

    return stores.map((store) => {
      const managers = store.userAssignments.map((ua) => ({
        fullName: ua.user.fullName,
        email: ua.user.email,
        mobileNumber: ua.user.mobileNumber,
      }));

      return {
        id: store.id,
        storeCode: store.storeCode,
        name: store.name,
        city: store.city,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        region: store.region,
        storeType: store.storeType,
        contactMobileNumber: managers[0]?.mobileNumber ?? null,
        storeManagers: managers,
      };
    });
  }

  /**
   * Retrieves a full Store profile by UUID. Throws `NotFoundException` if missing.
   */
  async findById(id: string): Promise<StoreWithRelations> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        region: true,
        storeType: true,
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID '${id}' was not found.`);
    }

    return store;
  }

  /**
   * Updates an existing Store record (including dynamic `latitude` / `longitude` coordinates).
   */
  async update(
    id: string,
    dto: UpdateStoreDto,
  ): Promise<StoreWithRelations> {
    const existing = await this.prisma.store.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Store with ID '${id}' was not found.`);
    }

    if (
      dto.storeCode &&
      dto.storeCode.trim().toUpperCase() !== existing.storeCode
    ) {
      const duplicate = await this.prisma.store.findUnique({
        where: { storeCode: dto.storeCode.trim().toUpperCase() },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('STORE_CODE_EXISTS');
      }
    }

    const updateData: Prisma.StoreUpdateInput = {
      ...(dto.storeCode !== undefined
        ? { storeCode: dto.storeCode.trim().toUpperCase() }
        : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.regionId !== undefined
        ? { region: { connect: { id: dto.regionId } } }
        : {}),
      ...(dto.storeTypeId !== undefined
        ? { storeType: { connect: { id: dto.storeTypeId } } }
        : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.address !== undefined
        ? { address: dto.address?.trim() ?? null }
        : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.openingDate !== undefined
        ? { openingDate: new Date(dto.openingDate) }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    return this.prisma.store.update({
      where: { id },
      data: updateData,
      include: {
        region: true,
        storeType: true,
      },
    });
  }

  /**
   * Soft-deletes a Store by setting `isActive = false`.
   */
  async softDelete(id: string): Promise<Store> {
    const existing = await this.prisma.store.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Store with ID '${id}' was not found.`);
    }

    return this.prisma.store.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Returns all active operational Regions sorted by name.
   */
  async getRegions(): Promise<Region[]> {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a new operational Region after validating unique `code`.
   */
  async createRegion(dto: CreateRegionDto): Promise<Region> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.region.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new ConflictException('REGION_CODE_EXISTS');
    }

    return this.prisma.region.create({
      data: {
        code: normalizedCode,
        name: dto.name.trim(),
        isActive: true,
      },
    });
  }

  /**
   * Returns all configured StoreTypes (`HYPERMARKET`, `SUPERMARKET`, `EXPRESS`).
   */
  async getStoreTypes(): Promise<StoreType[]> {
    return this.prisma.storeType.findMany({
      orderBy: { code: 'asc' },
    });
  }
}
