import { Injectable, Logger } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '@/core/database/prisma.service';

export interface MasterDataSeedSummary {
  usersSeeded: number;
  regionsSeeded: number;
  storeTypesSeeded: number;
  storesSeeded: number;
  categoriesSeeded: number;
  brandsSeeded: number;
  productsSeeded: number;
  inventoriesSeeded: number;
  posTransactionsSeeded: number;
  bhopalStoreId: string;
  indoreStoreId: string;
  centralMpRegionId: string;
  sku1024ProductId: string;
}

@Injectable()
export class MasterDataSeeder {
  private readonly logger = new Logger(MasterDataSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<MasterDataSeedSummary> {
    this.logger.log('Seeding 8 Operational Regions & 3 Store Formats...');

    const regionDefinitions = [
      { code: 'REG-CENTRAL-MP', name: 'Central MP (Bhopal & Narmadapuram)' },
      { code: 'REG-MALWA', name: 'Malwa Plateau (Indore & Ujjain)' },
      { code: 'REG-MUM-MMR', name: 'Mumbai Metropolitan Region (MMR)' },
      { code: 'REG-PUNE-WEST', name: 'Pune & Western Maharashtra' },
      { code: 'REG-DELHI-NCR', name: 'Delhi NCR & Gurugram' },
      { code: 'REG-BLR-SOUTH', name: 'Bengaluru Metro South' },
      { code: 'REG-HYD-DECCAN', name: 'Hyderabad Deccan Corridor' },
      { code: 'REG-EAST-UP', name: 'Eastern UP (Lucknow & Varanasi)' },
    ];

    const createdRegions = [];
    for (const reg of regionDefinitions) {
      const created = await this.prisma.region.create({
        data: {
          code: reg.code,
          name: reg.name,
          isActive: true,
        },
      });
      createdRegions.push(created);
    }

    const centralMpRegion = createdRegions[0];

    const formatDefinitions = [
      { code: 'HYPERMARKET', name: 'D-Mart / JioMart Destination Hypermarket' },
      { code: 'SUPERMARKET', name: 'Neighborhood Daily Supermarket' },
      { code: 'EXPRESS', name: 'Quick-Commerce Express Hub' },
    ];

    const createdFormats = [];
    for (const fmt of formatDefinitions) {
      const created = await this.prisma.storeType.create({
        data: {
          code: fmt.code,
          name: fmt.name,
        },
      });
      createdFormats.push(created);
    }

    this.logger.log('Seeding 50 Retail Stores across 8 Operational Regions...');

    // Store #1 and Store #2 are the Golden Path stores in Central MP Region (same region for peer transfer)
    const bhopalStore = await this.prisma.store.create({
      data: {
        storeCode: 'BPL-001',
        name: 'Bhopal MP Nagar Store',
        regionId: centralMpRegion.id,
        storeTypeId: createdFormats[1].id, // SUPERMARKET
        city: 'Bhopal',
        address: 'Plot 14, Zone-II, Maharana Pratap Nagar, Bhopal 462011',
        latitude: 23.2332,
        longitude: 77.4343,
        openingDate: new Date('2021-04-15'),
        isActive: true,
      },
    });

    const indoreStore = await this.prisma.store.create({
      data: {
        storeCode: 'IND-001',
        name: 'Indore Vijay Nagar Store',
        regionId: centralMpRegion.id,
        storeTypeId: createdFormats[0].id, // HYPERMARKET
        city: 'Indore',
        address: 'AB Road, Scheme 54, Vijay Nagar, Indore 452010',
        latitude: 22.7533,
        longitude: 75.8937,
        openingDate: new Date('2020-08-10'),
        isActive: true,
      },
    });

    const cityHubs = [
      { city: 'Bhopal', prefix: 'BPL', lat: 23.2599, lon: 77.4126, regIdx: 0 },
      { city: 'Indore', prefix: 'IND', lat: 22.7196, lon: 75.8577, regIdx: 1 },
      { city: 'Mumbai', prefix: 'MUM', lat: 19.1176, lon: 72.906, regIdx: 2 },
      { city: 'Pune', prefix: 'PUN', lat: 18.5913, lon: 73.7389, regIdx: 3 },
      { city: 'Gurugram', prefix: 'NCR', lat: 28.4595, lon: 77.0266, regIdx: 4 },
      { city: 'Bengaluru', prefix: 'BLR', lat: 12.9698, lon: 77.75, regIdx: 5 },
      { city: 'Hyderabad', prefix: 'HYD', lat: 17.4486, lon: 78.3908, regIdx: 6 },
      { city: 'Lucknow', prefix: 'LKO', lat: 26.8467, lon: 80.9462, regIdx: 7 },
    ];

    const allStores = [bhopalStore, indoreStore];

    for (let i = 3; i <= 50; i++) {
      const hub = cityHubs[(i - 3) % cityHubs.length];
      const format = createdFormats[i % createdFormats.length];
      const region = createdRegions[hub.regIdx];
      const storeCode = `${hub.prefix}-${String(i).padStart(3, '0')}`;

      const createdStore = await this.prisma.store.create({
        data: {
          storeCode,
          name: `${hub.city} Sector-${(i % 15) + 1} ${format.code === 'HYPERMARKET' ? 'Hypermarket' : format.code === 'SUPERMARKET' ? 'Supermarket' : 'Express Hub'}`,
          regionId: region.id,
          storeTypeId: format.id,
          city: hub.city,
          address: `Commercial Block ${i}, Main Arterial Road, ${hub.city}`,
          latitude: Number((hub.lat + (i % 7) * 0.015).toFixed(4)),
          longitude: Number((hub.lon + (i % 5) * 0.015).toFixed(4)),
          openingDate: new Date(2020 + (i % 4), i % 12, (i % 25) + 1),
          isActive: true,
        },
      });
      allStores.push(createdStore);
    }

    this.logger.log('Seeding 4 Default Enterprise Users with Argon2 Password Hashes...');
    const passwordHash = await argon2.hash('RetailHub@2026');

    const adminUser = await this.prisma.user.create({
      data: {
        email: 'admin@retailhub.com',
        passwordHash,
        fullName: 'Ananya Deshmukh (Platform Admin)',
        mobileNumber: '+91-9820990011',
        role: RoleType.ADMIN,
        isActive: true,
      },
    });

    await this.prisma.user.create({
      data: {
        email: 'executive@retailhub.com',
        passwordHash,
        fullName: 'Vikram Aditya (VP Retail Operations)',
        mobileNumber: '+91-9820778899',
        role: RoleType.EXECUTIVE,
        isActive: true,
      },
    });

    const regionalManagerUser = await this.prisma.user.create({
      data: {
        email: 'regional.central@retailhub.com',
        passwordHash,
        fullName: 'Priya Nair (Regional Manager — Central MP)',
        mobileNumber: '+91-9820445566',
        role: RoleType.REGIONAL_MANAGER,
        isActive: true,
      },
    });

    const bhopalManagerUser = await this.prisma.user.create({
      data: {
        email: 'store.bhopal@retailhub.com',
        passwordHash,
        fullName: 'Rajesh Sharma (Store Manager — BPL-001)',
        mobileNumber: '+91-9820112233',
        role: RoleType.STORE_MANAGER,
        isActive: true,
      },
    });

    await this.prisma.userRegionAssignment.create({
      data: {
        userId: regionalManagerUser.id,
        regionId: centralMpRegion.id,
      },
    });

    await this.prisma.userStoreAssignment.create({
      data: {
        userId: bhopalManagerUser.id,
        storeId: bhopalStore.id,
      },
    });

    this.logger.log('Seeding 10 Categories, 20 Brands & 500 Master SKUs...');

    const categoryDefs = [
      { code: 'CAT-EDIBLE-OIL', name: 'Edible Oils & Ghee' },
      { code: 'CAT-STAPLES', name: 'Rice, Atta & Pulses' },
      { code: 'CAT-DAIRY', name: 'UHT Milk & Dairy Products' },
      { code: 'CAT-GROCERY', name: 'Packaged Groceries & Spices' },
      { code: 'CAT-BEVERAGES', name: 'Tea, Coffee & Health Drinks' },
      { code: 'CAT-SNACKS', name: 'Instant Noodles & Biscuits' },
      { code: 'CAT-HOUSEHOLD', name: 'Detergents & Surface Cleaners' },
      { code: 'CAT-PERSONAL', name: 'Soaps, Oral & Hair Care' },
      { code: 'CAT-BABY', name: 'Baby Nutrition & Hygiene' },
      { code: 'CAT-DRYFRUIT', name: 'Dry Fruits & Festive Packs' },
    ];

    const createdCategories = [];
    for (const c of categoryDefs) {
      const cat = await this.prisma.category.create({
        data: { code: c.code, name: c.name, isActive: true },
      });
      createdCategories.push(cat);
    }

    const brandNames = [
      'Fortune Adani Wilmar',
      'Daawat Foods',
      'Amul GCMMF',
      'ITC Aashirvaad',
      'Nestlé India',
      'Tata Consumer',
      'Britannia Industries',
      'Hindustan Unilever',
      'Dabur India',
      'Marico Saffola',
      'Patanjali Foods',
      'Mother Dairy',
      'Haldiram Snacks',
      'Parle Products',
      'Godrej Consumer',
      'Colgate-Palmolive',
      'Everest Spices',
      'MDH Spices',
      'Bikaji Foods',
      'Nirma Consumer',
    ];

    const createdBrands = [];
    for (let i = 0; i < brandNames.length; i++) {
      const brd = await this.prisma.brand.create({
        data: {
          code: `BRD-${String(i + 1).padStart(2, '0')}`,
          name: brandNames[i],
          isActive: true,
        },
      });
      createdBrands.push(brd);
    }

    // Seed SKU-1024 ("Fortune Sunflower Oil 1L") as the primary Golden Path Product (BRD Section 37)
    const sku1024Product = await this.prisma.product.create({
      data: {
        sku: 'SKU-1024',
        productCode: '8901030383742',
        name: 'Fortune Sunflower Oil 1L',
        description:
          'Refined sunflower cooking oil 1L pouch — BRD Section 37 Golden Path SKU',
        brandId: createdBrands[0].id,
        categoryId: createdCategories[0].id,
        unitOfMeasure: 'LITRE',
        costPrice: 110.0,
        sellingPrice: 135.0,
        mrp: 150.0,
        isActive: true,
      },
    });

    const bulkProductData = [];
    const uoms = ['PIECE', 'PACK', 'KG', 'LITRE'];

    for (let idx = 1; idx <= 499; idx++) {
      const numericSku = idx >= 24 ? 1000 + idx + 1 : 1000 + idx;
      const cat = createdCategories[idx % createdCategories.length];
      const brd = createdBrands[idx % createdBrands.length];
      const baseCost = 45 + (idx % 25) * 12;
      const sellingPrice = Math.round(baseCost * 1.22);
      const mrp = Math.round(sellingPrice * 1.12);

      bulkProductData.push({
        sku: `SKU-${numericSku}`,
        productCode: `89010${String(30000000 + idx)}`,
        name: `${brd.name.split(' ')[0]} ${cat.name.split(' ')[0]} Pack #${idx}`,
        description: `High-velocity retail SKU #${idx} under ${cat.name}`,
        brandId: brd.id,
        categoryId: cat.id,
        unitOfMeasure: uoms[idx % uoms.length],
        costPrice: baseCost,
        sellingPrice,
        mrp,
        isActive: true,
      });
    }

    await this.prisma.product.createMany({
      data: bulkProductData,
    });

    const coreProducts = await this.prisma.product.findMany({
      take: 20,
      orderBy: { sku: 'asc' },
    });

    this.logger.log('Seeding baseline Inventory buffers & 6 Months of POS Sales...');

    const inventoryRows = [];
    for (const store of allStores.slice(0, 15)) {
      for (let pIdx = 0; pIdx < coreProducts.length; pIdx++) {
        const prod = coreProducts[pIdx];
        if (
          prod.id === sku1024Product.id &&
          (store.id === bhopalStore.id || store.id === indoreStore.id)
        ) {
          // Handled explicitly in GoldenPathSeeder
          continue;
        }

        const isExcessSample = (pIdx + store.storeCode.charCodeAt(0)) % 9 === 0;
        const isLowSample = (pIdx + store.storeCode.charCodeAt(4)) % 11 === 0;
        const availableQuantity = isExcessSample
          ? 145
          : isLowSample
            ? 8
            : 52;

        inventoryRows.push({
          storeId: store.id,
          productId: prod.id,
          availableQuantity,
          reservedQuantity: 0,
          inTransitQuantity: 0,
          minimumStock: 12,
          maximumStock: 100,
          reorderLevel: 20,
          version: 1,
        });
      }
    }

    await this.prisma.inventory.createMany({
      data: inventoryRows,
    });

    // Seed 6 months (180 days) of historical POS SalesTransactions using batch createMany
    const now = new Date();
    const posHeaderBatch = [];
    for (let dayOffset = 180; dayOffset >= 1; dayOffset--) {
      const txDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const targetStore = allStores[dayOffset % Math.min(allStores.length, 15)];
      const qty = 12 + (dayOffset % 18);
      const amount = qty * 135;

      posHeaderBatch.push({
        transactionNumber: `POS-HIST-${dayOffset}-${targetStore.storeCode}`,
        storeId: targetStore.id,
        transactionDate: txDate,
        customerId: `CUST-${1000 + (dayOffset % 250)}`,
        totalQuantity: qty,
        totalAmount: amount,
      });
    }

    await this.prisma.salesTransaction.createMany({
      data: posHeaderBatch,
    });

    return {
      usersSeeded: 4,
      regionsSeeded: createdRegions.length,
      storeTypesSeeded: createdFormats.length,
      storesSeeded: allStores.length,
      categoriesSeeded: createdCategories.length,
      brandsSeeded: createdBrands.length,
      productsSeeded: 500,
      inventoriesSeeded: inventoryRows.length,
      posTransactionsSeeded: posHeaderBatch.length,
      bhopalStoreId: bhopalStore.id,
      indoreStoreId: indoreStore.id,
      centralMpRegionId: centralMpRegion.id,
      sku1024ProductId: sku1024Product.id,
    };
  }
}
