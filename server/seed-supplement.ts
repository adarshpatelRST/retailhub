import { prisma } from "./db";
import { logger } from "./utils/logger";
import { subDays } from "date-fns";

export async function runSupplementSeed(): Promise<void> {
  logger.info("Starting supplement seed to ensure all 50 stores have realistic Inventory, Sales, Transfers, and Recommendations...");

  const allStores = await prisma.store.findMany({ include: { region: true } });
  const allProducts = await prisma.product.findMany({ take: 60 });
  const allCategories = await prisma.category.findMany();

  if (allStores.length === 0 || allProducts.length === 0) {
    logger.error("Stores or Products missing. Run base seed first.");
    return;
  }

  // 1. Ensure ALL 50 stores have inventory rows across health buckets
  logger.info("Ensuring full inventory coverage across all 50 stores...");
  const existingInventory = await prisma.inventory.findMany({
    select: { storeId: true, productId: true },
  });
  const existingInvSet = new Set(existingInventory.map((i) => `${i.storeId}::${i.productId}`));

  const newInventoryRows: any[] = [];
  for (let sIdx = 0; sIdx < allStores.length; sIdx++) {
    const store = allStores[sIdx];
    // Give each store 30 products
    for (let pIdx = 0; pIdx < Math.min(allProducts.length, 30); pIdx++) {
      const prod = allProducts[pIdx];
      const key = `${store.id}::${prod.id}`;
      if (existingInvSet.has(key)) continue;

      const mod = (sIdx * 7 + pIdx) % 10;
      let qty = 40; // HEALTHY default
      if (mod === 0) qty = 2; // CRITICAL
      else if (mod === 1 || mod === 2) qty = 7; // LOW
      else if (mod === 9) qty = 160; // EXCESS

      newInventoryRows.push({
        storeId: store.id,
        productId: prod.id,
        availableQuantity: qty,
        reservedQuantity: 0,
        inTransitQuantity: mod === 0 ? 15 : 0,
        minimumStock: 10,
        maximumStock: 90,
        reorderLevel: 20,
        version: 1,
      });
      existingInvSet.add(key);
    }
  }

  for (let i = 0; i < newInventoryRows.length; i += 100) {
    const batch = newInventoryRows.slice(i, i + 100);
    await prisma.inventory.createMany({ data: batch });
  }
  logger.info(`Added ${newInventoryRows.length} new inventory rows.`);

  // 2. Ensure ALL 50 stores have historical POS sales over the last 90 days
  logger.info("Ensuring recent POS sales transactions for all 50 stores...");
  const newSales: any[] = [];
  const now = new Date();

  // For each store, seed 2-4 transactions per week over the last 35 days
  for (const store of allStores) {
    for (let dayOffset = 1; dayOffset <= 35; dayOffset += 2) {
      const txDate = subDays(now, dayOffset);
      const units = 12 + ((store.storeCode.charCodeAt(0) + dayOffset) % 20);
      const amount = units * (120 + ((dayOffset * 17) % 60));

      newSales.push({
        transactionNumber: `POS-${store.storeCode}-${dayOffset}-${Date.now().toString().slice(-4)}`,
        storeId: store.id,
        transactionDate: txDate,
        customerId: `CUST-${1000 + ((dayOffset * 13) % 400)}`,
        totalQuantity: units,
        totalAmount: amount,
      });
    }
  }

  for (let i = 0; i < newSales.length; i += 100) {
    const batch = newSales.slice(i, i + 100);
    await prisma.salesTransaction.createMany({ data: batch });
  }
  logger.info(`Added ${newSales.length} POS sales transactions.`);

  // 3. Seed Realistic Stock Transfers (both APPROVED_IN_TRANSIT and COMPLETED)
  const currentTransfers = await prisma.stockTransfer.count();
  if (currentTransfers === 0) {
    logger.info("Seeding realistic StockTransfers across regions...");
    const transferStatuses = ["APPROVED_IN_TRANSIT", "APPROVED_IN_TRANSIT", "COMPLETED", "COMPLETED", "PENDING_APPROVAL"];

    for (let i = 0; i < 25; i++) {
      const fromStore = allStores[i % allStores.length];
      // Pick a peer store in same region or adjacent
      const peerStores = allStores.filter((s) => s.regionId === fromStore.regionId && s.id !== fromStore.id);
      const toStore = peerStores.length > 0 ? peerStores[i % peerStores.length] : allStores[(i + 3) % allStores.length];
      const prod = allProducts[i % allProducts.length];
      const status = transferStatuses[i % transferStatuses.length];
      const createdAt = subDays(now, (i * 3) % 28);

      const st = await prisma.stockTransfer.create({
        data: {
          transferNumber: `TRF-2026-${1000 + i}`,
          fromStoreId: fromStore.id,
          toStoreId: toStore.id,
          status,
          carrierName: "BlueDart Supply Logistics",
          vehicleNumber: `MH-${12 + (i % 20)}-AB-${1000 + (i * 37) % 8999}`,
          dispatchNoteNumber: `DN-2026-${8000 + i}`,
          estimatedArrival: subDays(now, -1),
          dispatchedAt: subDays(now, 1),
          requestedBy: "Auto-Rebalance Engine",
          approvedBy: "Regional Ops Lead",
          createdAt,
          lines: {
            create: [
              {
                productId: prod.id,
                requestedQty: 25.0,
                approvedQty: 25.0,
                receivedQty: status === "COMPLETED" ? 25.0 : null,
              },
            ],
          },
        },
      });
    }
    logger.info("StockTransfers seeded successfully.");
  }

  // 4. Seed Actionable Recommendations for various stores
  const currentRecs = await prisma.recommendation.count();
  const availableTransfers = await prisma.stockTransfer.findMany({ select: { id: true } });

  if (currentRecs <= 1 && availableTransfers.length > 0) {
    logger.info("Seeding diverse Recommendation records with evidence...");
    const priorities = ["CRITICAL", "HIGH", "HIGH", "MEDIUM"];

    for (let i = 1; i <= Math.min(15, availableTransfers.length); i++) {
      const targetStore = allStores[i % allStores.length];
      const peerStores = allStores.filter((s) => s.regionId === targetStore.regionId && s.id !== targetStore.id);
      const donorStore = peerStores.length > 0 ? peerStores[0] : allStores[(i + 5) % allStores.length];
      const prod = allProducts[i % allProducts.length];
      const priority = priorities[i % priorities.length];

      await prisma.recommendation.create({
        data: {
          recommendationNumber: `REC-2026-${1000 + i}`,
          recommendationType: "STOCK_TRANSFER",
          storeId: targetStore.id,
          fromStoreId: donorStore.id,
          toStoreId: targetStore.id,
          productId: prod.id,
          recommendedQuantity: 15.0 + (i % 10),
          priority,
          reason: `Stockout prevention rebalance: ${targetStore.name} has low DOI for ${prod.name}. Transferring surplus from ${donorStore.name}.`,
          status: "OPEN",
          isManualRequest: false,
          stockTransferId: availableTransfers[i - 1]?.id,
          aiExplanation: `${targetStore.name} currently operates below safety stock. Rebalancing restores DOI to 14.5 days.`,
          evidence: {
            create: [
              {
                metric: "Current Stock",
                value: `${2 + (i % 3)} units`,
                description: `${targetStore.name} available stock on hand`,
              },
              {
                metric: "Days of Inventory",
                value: `${(1.2 + (i % 2) * 0.9).toFixed(1)} days`,
                description: "Critical threshold < 3.0 days",
              },
            ],
          },
        },
      });
    }
    logger.info("Recommendations seeded successfully.");
  }

  logger.info("Supplement seed completed successfully!");
}

if (process.argv[1]?.includes("seed-supplement")) {
  runSupplementSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error("Supplement seed failed:", err);
      process.exit(1);
    });
}
