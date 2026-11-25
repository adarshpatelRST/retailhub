import { prisma } from "./db";
import { logger } from "./utils/logger";

export async function seedFullInventoryCoverage(): Promise<void> {
  logger.info("Checking catalog inventory coverage across enterprise store network...");

  const [stores, products, existingInventories] = await Promise.all([
    prisma.store.findMany({ select: { id: true, storeCode: true } }),
    prisma.product.findMany({ select: { id: true, sku: true, name: true } }),
    prisma.inventory.findMany({ select: { storeId: true, productId: true } }),
  ]);

  if (stores.length === 0 || products.length === 0) {
    logger.warn("Stores or products not found, skipping inventory coverage seeding.");
    return;
  }

  const existingSet = new Set(existingInventories.map((i) => `${i.storeId}::${i.productId}`));
  logger.info(`Found ${stores.length} stores, ${products.length} products, and ${existingInventories.length} existing inventory records.`);

  const newRows: any[] = [];

  // Ensure EVERY product has inventory in at least 6-12 stores
  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    const prod = products[pIdx];

    // Pick 8 stores for each product deterministically distributed across network
    const storeCountForProduct = 8;
    for (let sOffset = 0; sOffset < storeCountForProduct; sOffset++) {
      const storeIdx = (pIdx * 3 + sOffset * 5) % stores.length;
      const store = stores[storeIdx];
      const key = `${store.id}::${prod.id}`;

      if (existingSet.has(key)) continue;

      const mod = (pIdx + storeIdx) % 10;
      let qty = 35; // Default healthy stock
      if (mod === 0) qty = 4; // LOW / REORDER
      else if (mod === 1) qty = 8; // LOW
      else if (mod === 2) qty = 65; // HEALTHY
      else if (mod === 3) qty = 90; // HEALTHY
      else if (mod === 8) qty = 120; // HIGH
      else if (mod === 9) qty = 140; // EXCESS

      newRows.push({
        storeId: store.id,
        productId: prod.id,
        availableQuantity: qty,
        reservedQuantity: 0,
        inTransitQuantity: 0,
        minimumStock: 10,
        maximumStock: 120,
        reorderLevel: 20,
        version: 1,
      });

      existingSet.add(key);
    }
  }

  if (newRows.length === 0) {
    logger.info("All products already have full inventory coverage.");
    return;
  }

  logger.info(`Inserting ${newRows.length} inventory records in batches of 200...`);
  for (let i = 0; i < newRows.length; i += 200) {
    const batch = newRows.slice(i, i + 200);
    await prisma.inventory.createMany({ data: batch });
  }

  const totalInvCount = await prisma.inventory.count();
  logger.info(`Inventory coverage complete. Total inventory records now: ${totalInvCount}.`);
}

// Allow standalone execution
if (process.argv[1]?.includes("seed-inventory-coverage")) {
  seedFullInventoryCoverage()
    .then(() => {
      logger.info("Inventory coverage script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Inventory coverage script failed:", err);
      process.exit(1);
    });
}

