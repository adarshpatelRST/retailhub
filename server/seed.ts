import { prisma } from "./db";
import { hashPassword } from "./auth";
import { logger } from "./utils/logger";
import { seedRealisticStockTransfers } from "./seed-transfers";
import { seedRecommendations } from "./seed-recommendations";
import { seedAuditLogs } from "./seed-audit";

export async function runDatabaseSeed(options?: { cleanReset?: boolean }): Promise<void> {
  const cleanReset = options?.cleanReset ?? true;

  logger.info(`Starting RetailHub Production Enterprise Database Seeding (cleanReset=${cleanReset})...`);

  if (cleanReset) {
    logger.warn("Executing clean, cascading reverse-dependency purge across all 21 Microsoft SQL Server tables...");
    await prisma.$executeRawUnsafe(`
      DELETE FROM ActionHistory;
      DELETE FROM [Action];
      DELETE FROM RecommendationEvidence;
      DELETE FROM Recommendation;
      DELETE FROM StockTransferLine;
      DELETE FROM StockTransfer;
      DELETE FROM InventoryMovement;
      DELETE FROM SalesTransactionLine;
      DELETE FROM SalesTransaction;
      DELETE FROM InventoryRule;
      DELETE FROM Inventory;
      DELETE FROM AuditLog;
      DELETE FROM Product;
      DELETE FROM Brand;
      DELETE FROM Category;
      DELETE FROM UserStoreAssignment;
      DELETE FROM UserRegionAssignment;
      DELETE FROM Store;
      DELETE FROM StoreType;
      DELETE FROM Region;
      DELETE FROM [User];
    `);
    logger.info("Cascading reverse-dependency database purge executed successfully.");

    // Guarantee Recommendation_stockTransferId_key is a filtered unique index in SQL Server (allowing multiple NULLs)
    try {
      await prisma.$executeRawUnsafe(`
        IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'Recommendation_stockTransferId_key')
          ALTER TABLE [dbo].[Recommendation] DROP CONSTRAINT [Recommendation_stockTransferId_key];
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'Recommendation_stockTransferId_key' AND has_filter = 0)
          DROP INDEX [Recommendation_stockTransferId_key] ON [dbo].[Recommendation];
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'Recommendation_stockTransferId_key')
          CREATE UNIQUE NONCLUSTERED INDEX [Recommendation_stockTransferId_key] 
          ON [dbo].[Recommendation]([stockTransferId] ASC) 
          WHERE [stockTransferId] IS NOT NULL;
      `);
    } catch {
      // Index already configured
    }
  } else {
    const existingStores = await prisma.store.count();
    if (existingStores > 0) {
      logger.info(`Database already seeded (${existingStores} stores present). Skipping duplicate seed execution.`);
      const auditCount = await prisma.auditLog.count();
      if (auditCount === 0) {
        logger.info("Audit log history empty. Seeding baseline enterprise audit trail...");
        await seedAuditLogs();
      }
      return;
    }
  }

  // 1. Seed 4 Operational Users (including 2 Baseline System Users) with Argon2 Hash
  logger.info("Seeding baseline users (admin@retailhub.com, executive@retailhub.com)...");
  const passwordHash = await hashPassword("RetailHub@2026");

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@retailhub.com",
      passwordHash,
      fullName: "Ananya Deshmukh (Platform Admin)",
      mobileNumber: "+91-9820990011",
      role: "ADMIN",
      isActive: true,
    },
  });

  const executiveUser = await prisma.user.create({
    data: {
      email: "executive@retailhub.com",
      passwordHash,
      fullName: "Vikram Aditya (VP Retail Operations)",
      mobileNumber: "+91-9820778899",
      role: "EXECUTIVE",
      isActive: true,
    },
  });

  const regionalManagerUser = await prisma.user.create({
    data: {
      email: "regional.central@retailhub.com",
      passwordHash,
      fullName: "Priya Nair (Regional Manager — Central MP)",
      mobileNumber: "+91-9820445566",
      role: "REGIONAL_MANAGER",
      isActive: true,
    },
  });

  const bhopalManagerUser = await prisma.user.create({
    data: {
      email: "store.bhopal@retailhub.com",
      passwordHash,
      fullName: "Rajesh Sharma (Store Manager — BPL-001)",
      mobileNumber: "+91-9820112233",
      role: "STORE_MANAGER",
      isActive: true,
    },
  });

  logger.info("Users seeded successfully.");

  // 2. Seed 8 Operational Regions
  logger.info("Seeding 8 Operational Regions...");
  const regionDefs = [
    { code: "REG-CENTRAL-MP", name: "Central MP (Bhopal & Narmadapuram)" },
    { code: "REG-MALWA", name: "Malwa Plateau (Indore & Ujjain)" },
    { code: "REG-MUM-MMR", name: "Mumbai Metropolitan Region (MMR)" },
    { code: "REG-PUNE-WEST", name: "Pune & Western Maharashtra" },
    { code: "REG-DELHI-NCR", name: "Delhi NCR & Gurugram" },
    { code: "REG-BLR-SOUTH", name: "Bengaluru Metro South" },
    { code: "REG-HYD-DECCAN", name: "Hyderabad Deccan Corridor" },
    { code: "REG-EAST-UP", name: "Eastern UP (Lucknow & Varanasi)" },
  ];

  const regions: any[] = [];
  for (const r of regionDefs) {
    const created = await prisma.region.create({
      data: { code: r.code, name: r.name, isActive: true },
    });
    regions.push(created);
  }
  const centralMpRegion = regions[0];

  // 3. Seed 3 Store Formats
  logger.info("Seeding 3 Store Formats (HYPERMARKET, SUPERMARKET, EXPRESS)...");
  const formatDefs = [
    { code: "HYPERMARKET", name: "D-Mart / JioMart Destination Hypermarket" },
    { code: "SUPERMARKET", name: "Neighborhood Daily Supermarket" },
    { code: "EXPRESS", name: "Quick-Commerce Express Hub" },
  ];

  const formats: any[] = [];
  for (const f of formatDefs) {
    const created = await prisma.storeType.create({
      data: { code: f.code, name: f.name },
    });
    formats.push(created);
  }

  // 4. Seed 50 Retail Stores (with Bhopal BPL-001 & Indore IND-001 in Central MP)
  logger.info("Seeding 50 Retail Stores across 8 Regions...");

  // Golden Path Stores (both in Central MP region for intra-region transfer benchmark)
  const bhopalStore = await prisma.store.create({
    data: {
      storeCode: "BPL-001",
      name: "Bhopal MP Nagar Store",
      regionId: centralMpRegion.id,
      storeTypeId: formats[1].id, // SUPERMARKET
      city: "Bhopal",
      address: "Plot 14, Zone-II, Maharana Pratap Nagar, Bhopal 462011",
      latitude: 23.2332,
      longitude: 77.4343,
      openingDate: new Date("2021-04-15"),
      isActive: true,
    },
  });

  const indoreStore = await prisma.store.create({
    data: {
      storeCode: "IND-001",
      name: "Indore Vijay Nagar Store",
      regionId: centralMpRegion.id,
      storeTypeId: formats[0].id, // HYPERMARKET
      city: "Indore",
      address: "AB Road, Scheme 54, Vijay Nagar, Indore 452010",
      latitude: 22.7533,
      longitude: 75.8937,
      openingDate: new Date("2020-08-10"),
      isActive: true,
    },
  });

  const cityHubs = [
    { city: "Bhopal", prefix: "BPL", lat: 23.2599, lon: 77.4126, regIdx: 0 },
    { city: "Indore", prefix: "IND", lat: 22.7196, lon: 75.8577, regIdx: 1 },
    { city: "Mumbai", prefix: "MUM", lat: 19.1176, lon: 72.906, regIdx: 2 },
    { city: "Pune", prefix: "PUN", lat: 18.5913, lon: 73.7389, regIdx: 3 },
    { city: "Gurugram", prefix: "DEL", lat: 28.4595, lon: 77.0266, regIdx: 4 },
    { city: "Bengaluru", prefix: "BLR", lat: 12.9698, lon: 77.75, regIdx: 5 },
    { city: "Hyderabad", prefix: "HYD", lat: 17.4486, lon: 78.3908, regIdx: 6 },
    { city: "Lucknow", prefix: "LKO", lat: 26.8467, lon: 80.9462, regIdx: 7 },
  ];

  const allStores = [bhopalStore, indoreStore];

  for (let i = 3; i <= 50; i++) {
    const hub = cityHubs[(i - 3) % cityHubs.length];
    const format = formats[i % formats.length];
    const region = regions[hub.regIdx];
    const storeCode = `${hub.prefix}-${String(i).padStart(3, "0")}`;

    const createdStore = await prisma.store.create({
      data: {
        storeCode,
        name: `${hub.city} Sector-${(i % 15) + 1} ${format.code === "HYPERMARKET" ? "Hypermarket" : format.code === "SUPERMARKET" ? "Supermarket" : "Express Hub"}`,
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
  logger.info(`50 Retail Stores created.`);

  // 5. Connect User Region & Store Assignments
  await prisma.userRegionAssignment.create({
    data: {
      userId: regionalManagerUser.id,
      regionId: centralMpRegion.id,
    },
  });

  await prisma.userStoreAssignment.create({
    data: {
      userId: bhopalManagerUser.id,
      storeId: bhopalStore.id,
    },
  });

  await prisma.userStoreAssignment.create({
    data: {
      userId: adminUser.id,
      storeId: bhopalStore.id,
    },
  });

  // 6. Seed 10 Hierarchical Categories
  logger.info("Seeding 10 Categories & 20 Brands...");
  const categoryDefs = [
    { code: "CAT-EDIBLE-OIL", name: "Edible Oils & Ghee" },
    { code: "CAT-STAPLES", name: "Rice, Atta & Pulses" },
    { code: "CAT-DAIRY", name: "UHT Milk & Dairy Products" },
    { code: "CAT-GROCERY", name: "Packaged Groceries & Spices" },
    { code: "CAT-BEVERAGES", name: "Tea, Coffee & Health Drinks" },
    { code: "CAT-SNACKS", name: "Instant Noodles & Biscuits" },
    { code: "CAT-HOUSEHOLD", name: "Detergents & Surface Cleaners" },
    { code: "CAT-PERSONAL", name: "Soaps, Oral & Hair Care" },
    { code: "CAT-BABY", name: "Baby Nutrition & Hygiene" },
    { code: "CAT-DRYFRUIT", name: "Dry Fruits & Festive Packs" },
  ];

  const categories: any[] = [];
  for (const c of categoryDefs) {
    const cat = await prisma.category.create({
      data: { code: c.code, name: c.name, isActive: true },
    });
    categories.push(cat);
  }

  // 7. Seed 20 FMCG Brands
  const brandNames = [
    "Fortune Adani Wilmar",
    "Daawat Foods",
    "Amul GCMMF",
    "ITC Aashirvaad",
    "Nestlé India",
    "Tata Consumer",
    "Britannia Industries",
    "Hindustan Unilever",
    "Dabur India",
    "Marico Saffola",
    "Patanjali Foods",
    "Mother Dairy",
    "Haldiram Snacks",
    "Parle Products",
    "Godrej Consumer",
    "Colgate-Palmolive",
    "Everest Spices",
    "MDH Spices",
    "Bikaji Foods",
    "Nirma Consumer",
  ];

  const brands: any[] = [];
  for (let i = 0; i < brandNames.length; i++) {
    const brd = await prisma.brand.create({
      data: {
        code: `BRD-${String(i + 1).padStart(2, "0")}`,
        name: brandNames[i],
        isActive: true,
      },
    });
    brands.push(brd);
  }

  // 8. Seed 500 Products/SKUs (Starting with Golden Path SKU-1024)
  logger.info("Seeding 500 Master Products / SKUs...");

  // Primary Golden Path Product (BRD Section 37)
  const sku1024Product = await prisma.product.create({
    data: {
      sku: "SKU-1024",
      productCode: "8901030383742",
      name: "Fortune Sunflower Oil 1L",
      description: "Refined sunflower cooking oil 1L pouch — BRD Section 37 Golden Path SKU",
      brandId: brands[0].id,
      categoryId: categories[0].id,
      unitOfMeasure: "LITRE",
      costPrice: 110.0,
      sellingPrice: 135.0,
      mrp: 150.0,
      isActive: true,
    },
  });

  const uoms = ["PIECE", "PACK", "KG", "LITRE"];
  const bulkProductData: any[] = [];

  for (let idx = 1; idx <= 499; idx++) {
    const numericSku = idx >= 24 ? 1000 + idx + 1 : 1000 + idx;
    const cat = categories[idx % categories.length];
    const brd = brands[idx % brands.length];
    const baseCost = 45 + (idx % 25) * 12;
    const sellingPrice = Math.round(baseCost * 1.22);
    const mrp = Math.round(sellingPrice * 1.15);

    bulkProductData.push({
      sku: `SKU-${numericSku}`,
      productCode: `89010${String(30000000 + idx)}`,
      name: `${brd.name.split(" ")[0]} ${cat.name.split(" ")[0]} Pack #${idx}`,
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

  // Insert in batches of 100 for SQL Server
  for (let i = 0; i < bulkProductData.length; i += 100) {
    const slice = bulkProductData.slice(i, i + 100);
    await prisma.product.createMany({ data: slice });
  }

  const allProducts = await prisma.product.findMany({
    take: 30,
    orderBy: { sku: "asc" },
  });
  logger.info(`500 Products seeded.`);

  // 9. Seed Inventory Balances across Health Buckets
  logger.info("Seeding inventory balances across health buckets...");

  // Bhopal MP Nagar (BPL-001) Inventory: 3.000 units (HIGH Risk / CRITICAL)
  await prisma.inventory.create({
    data: {
      storeId: bhopalStore.id,
      productId: sku1024Product.id,
      availableQuantity: 3.0,
      reservedQuantity: 0.0,
      inTransitQuantity: 0.0,
      minimumStock: 10.0,
      maximumStock: 80.0,
      reorderLevel: 20.0,
      version: 1,
    },
  });

  // Indore Vijay Nagar (IND-001) Inventory: 55.000 units (EXCESS Donor)
  await prisma.inventory.create({
    data: {
      storeId: indoreStore.id,
      productId: sku1024Product.id,
      availableQuantity: 55.0,
      reservedQuantity: 0.0,
      inTransitQuantity: 0.0,
      minimumStock: 10.0,
      maximumStock: 45.0,
      reorderLevel: 15.0,
      version: 1,
    },
  });

  // Additional Store Inventory Balances across CRITICAL, LOW, HEALTHY, EXCESS
  const inventoryRows: any[] = [];
  for (const store of allStores.slice(0, 20)) {
    for (let pIdx = 0; pIdx < allProducts.length; pIdx++) {
      const prod = allProducts[pIdx];
      if (prod.id === sku1024Product.id && (store.id === bhopalStore.id || store.id === indoreStore.id)) {
        continue;
      }

      const modVal = (pIdx + store.storeCode.charCodeAt(0)) % 10;
      let availableQuantity = 45; // HEALTHY default
      if (modVal === 0) availableQuantity = 2; // CRITICAL
      else if (modVal === 1 || modVal === 2) availableQuantity = 8; // LOW
      else if (modVal === 9) availableQuantity = 150; // EXCESS

      inventoryRows.push({
        storeId: store.id,
        productId: prod.id,
        availableQuantity,
        reservedQuantity: 0,
        inTransitQuantity: 0,
        minimumStock: 10,
        maximumStock: 90,
        reorderLevel: 20,
        version: 1,
      });
    }
  }

  for (let i = 0; i < inventoryRows.length; i += 100) {
    const slice = inventoryRows.slice(i, i + 100);
    await prisma.inventory.createMany({ data: slice });
  }
  logger.info(`Inventory balances seeded across health buckets.`);

  // 10. Seed 6 Months of Historical POS Sales Transactions
  logger.info("Seeding 6 months (180 days) of historical POS sales transactions...");
  const now = new Date();
  const recentTxDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Exact 30-day POS Sales for Golden Path:
  // Bhopal: 63 units / 30d = 2.100 ADS (DOI = 3.0 / 2.1 = 1.43 days)
  const bplTx = await prisma.salesTransaction.create({
    data: {
      transactionNumber: `POS-GP-BPL-${Date.now()}`,
      storeId: bhopalStore.id,
      transactionDate: recentTxDate,
      customerId: "GOLDEN_PATH_BASELINE",
      totalQuantity: 63.0,
      totalAmount: 63.0 * 135.0,
      lines: {
        create: [
          {
            productId: sku1024Product.id,
            quantity: 63.0,
            unitPrice: 135.0,
            discount: 0.0,
            netAmount: 63.0 * 135.0,
          },
        ],
      },
    },
  });

  // Indore: 15 units / 30d = 0.500 ADS (DOI = 55.0 / 0.5 = 110.0 days)
  const indTx = await prisma.salesTransaction.create({
    data: {
      transactionNumber: `POS-GP-IND-${Date.now()}`,
      storeId: indoreStore.id,
      transactionDate: recentTxDate,
      customerId: "GOLDEN_PATH_BASELINE",
      totalQuantity: 15.0,
      totalAmount: 15.0 * 135.0,
      lines: {
        create: [
          {
            productId: sku1024Product.id,
            quantity: 15.0,
            unitPrice: 135.0,
            discount: 0.0,
            netAmount: 15.0 * 135.0,
          },
        ],
      },
    },
  });

  // 180 Days of Historical Daily Transactions
  const posHeaders: any[] = [];
  for (let dayOffset = 180; dayOffset >= 1; dayOffset--) {
    const txDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const targetStore = allStores[dayOffset % Math.min(allStores.length, 15)];
    const qty = 15 + (dayOffset % 25);
    const amount = qty * 140;

    posHeaders.push({
      transactionNumber: `POS-HIST-${dayOffset}-${targetStore.storeCode}`,
      storeId: targetStore.id,
      transactionDate: txDate,
      customerId: `CUST-${1000 + (dayOffset % 200)}`,
      totalQuantity: qty,
      totalAmount: amount,
    });
  }

  for (let i = 0; i < posHeaders.length; i += 50) {
    const slice = posHeaders.slice(i, i + 50);
    await prisma.salesTransaction.createMany({ data: slice });
  }
  logger.info(`6 months of POS sales transactions seeded.`);

  // 11. Seed Bhopal-Indore Golden Path Benchmark Scenario (BRD Section 37) with live REC-1001
  logger.info("Seeding Bhopal-Indore Golden Path Recommendation REC-1001 with Evidence records...");

  const rec1001 = await prisma.recommendation.create({
    data: {
      recommendationNumber: "REC-1001",
      recommendationType: "STOCK_TRANSFER",
      storeId: bhopalStore.id,
      fromStoreId: indoreStore.id,
      toStoreId: bhopalStore.id,
      productId: sku1024Product.id,
      recommendedQuantity: 25.0,
      priority: "HIGH",
      reason:
        "Urgent stockout prevention: Bhopal store has 1.43 days of inventory remaining (3 units on hand, 2.1 units/day ADS). Indore store holds 55 units (110 days of inventory, excess above max capacity of 45 units). Inter-store transfer of 25 units will rebalance both stores within regional threshold.",
      status: "OPEN",
      isManualRequest: false,
      aiExplanation:
        "Bhopal MP Nagar Store (BPL-001) has dropped to a critical 1.43 days of inventory (3.000 units at 2.10 ADS) for Fortune Sunflower Oil 1L. Indore Vijay Nagar Store (IND-001), located 195 km away (~4.5 hrs road transit via NH-86), currently holds 55.000 units (110.0d DOI). Transferring 25.000 units restores Bhopal to 13.3d DOI while keeping Indore safely cushioned at 60.0d DOI, protecting ₹3,375 in gross margin velocity.",
      evidence: {
        create: [
          {
            metric: "Current Stock (Bhopal)",
            value: "3 units",
            description: "Bhopal MP Nagar Store available stock on hand",
          },
          {
            metric: "Days of Inventory (Bhopal)",
            value: "1.43 days",
            description: "Severe stockout risk (critical threshold < 3.0 days)",
          },
          {
            metric: "Average Daily Sales (Bhopal)",
            value: "2.10 units/day",
            description: "Based on last 30 days POS velocity",
          },
          {
            metric: "Current Stock (Indore)",
            value: "55 units",
            description: "Indore Vijay Nagar Store available stock on hand",
          },
          {
            metric: "Days of Inventory (Indore)",
            value: "110.0 days",
            description: "Excess stock tier (donor threshold > 45.0 days)",
          },
          {
            metric: "Distance & Transit",
            value: "195 km / 4.5 hrs",
            description: "Intra-region peer transit corridor between Indore and Bhopal",
          },
          {
            metric: "Post-Transfer Bhopal DOI",
            value: "13.3 days",
            description: "Normalizes Bhopal to healthy stock buffer (target 14d)",
          },
          {
            metric: "Post-Transfer Indore DOI",
            value: "60.0 days",
            description: "Maintains adequate buffer in Indore without stock risk",
          },
        ],
      },
    },
  });

  // 12. Seed Baseline Inventory Rules
  logger.info("Seeding baseline inventory rules in InventoryRule...");
  await prisma.inventoryRule.create({
    data: {
      storeId: bhopalStore.id,
      productId: sku1024Product.id,
      minimumStock: 10.0,
      maximumStock: 80.0,
      reorderLevel: 20.0,
      safetyStock: 15.0,
      isActive: true,
      version: 1,
    },
  });

  await prisma.inventoryRule.create({
    data: {
      storeId: indoreStore.id,
      productId: sku1024Product.id,
      minimumStock: 10.0,
      maximumStock: 45.0,
      reorderLevel: 15.0,
      safetyStock: 10.0,
      isActive: true,
      version: 1,
    },
  });

  logger.info("Seeding realistic StockTransfers across stores and regions...");
  await seedRealisticStockTransfers();

  logger.info("Seeding additional Action Center recommendations...");
  await seedRecommendations();

  logger.info("Seeding baseline enterprise audit trail...");
  await seedAuditLogs();

  logger.info("================================================================================");
  logger.info("RETAILHUB PRODUCTION DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  logger.info("Summary:");
  logger.info(` - System Users: 4 (admin@retailhub.com, executive@retailhub.com, password: RetailHub@2026)`);
  logger.info(` - Operational Regions: 8`);
  logger.info(` - Store Formats: 3 (HYPERMARKET, SUPERMARKET, EXPRESS)`);
  logger.info(` - Retail Stores: 50 (BPL-001, IND-001, MUM-003...)`);
  logger.info(` - Hierarchical Categories: 10`);
  logger.info(` - Brands: 20`);
  logger.info(` - Master Products: 500 (SKU-1024 Fortune Sunflower Oil 1L)`);
  logger.info(` - Store Inventory Balances across health buckets: ${inventoryRows.length + 2}`);
  logger.info(` - Historical POS Sales: 6 Months (180+ transactions)`);
  logger.info(` - Golden Path Live Benchmark: REC-1001 with 8 Evidence Metrics`);
  logger.info("================================================================================");
}

if (process.argv[1]?.includes("seed.ts") || process.argv[1]?.includes("seed")) {
  const cleanReset = !process.argv.includes("--no-clean");
  runDatabaseSeed({ cleanReset })
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error("Seed execution failed:", err);
      process.exit(1);
    });
}
