import { prisma } from "./db";

function subHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function seedRealisticStockTransfers(): Promise<void> {
  console.log("Seeding realistic Stock Transfers for Bhopal & other stores...");

  const allStores = await prisma.store.findMany({
    include: { region: true },
    orderBy: { storeCode: "asc" },
  });

  const bhopalStore = allStores.find((s) => s.storeCode === "BPL-001");
  const indoreStore = allStores.find((s) => s.storeCode === "IND-001");
  const jabalpurStore =
    allStores.find(
      (s) =>
        s.storeCode.startsWith("JBP") ||
        (s.regionId === bhopalStore?.regionId &&
          s.id !== bhopalStore?.id &&
          s.id !== indoreStore?.id),
    ) || allStores[2];

  if (!bhopalStore || !indoreStore) {
    console.error("Required stores missing!");
    return;
  }

  // Find popular SKUs
  const allProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: "SKU-1024" }, // Fortune Sunflower Oil 1L
        { sku: "SKU-1088" }, // Aashirvaad Shudh Chakki Atta 10kg
        { sku: "SKU-1015" }, // Daawat Rozana Basmati Rice 5kg
        { sku: "SKU-1033" }, // Amul Butter Pasteurised 500g
        { sku: "SKU-1052" }, // Surf Excel Matic Front Load 2kg
      ],
    },
  });

  const fallbackProducts = await prisma.product.findMany({ take: 10 });
  const productsToUse = allProducts.length >= 3 ? allProducts : fallbackProducts;

  const now = new Date();

  // 1. Bhopal Incoming Transfers (3 in-transit for dock tracker, 2 completed)
  const bhopalTransfers = [
    {
      transferNumber: "TRF-2026-9001",
      fromStoreId: indoreStore.id,
      toStoreId: bhopalStore.id,
      status: "APPROVED_IN_TRANSIT",
      carrierName: "Delhivery Surface Freight",
      vehicleNumber: "MP-09-HH-4821",
      dispatchNoteNumber: "DN-2026-9001",
      dispatchedAt: subHours(now, 3),
      estimatedArrival: subHours(now, -2), // in ~2 hours
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Ops Lead",
      lines: [
        {
          productId: productsToUse[0].id,
          requestedQty: 10.0,
          approvedQty: 10.0,
        },
      ],
    },
    {
      transferNumber: "TRF-2026-9002",
      fromStoreId: indoreStore.id,
      toStoreId: bhopalStore.id,
      status: "APPROVED_IN_TRANSIT",
      carrierName: "BlueDart Express Fleet",
      vehicleNumber: "MP-04-GA-9912",
      dispatchNoteNumber: "DN-2026-9002",
      dispatchedAt: subHours(now, 2),
      estimatedArrival: subHours(now, -1), // in ~1 hour
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Ops Lead",
      lines: [
        {
          productId: productsToUse[1 % productsToUse.length].id,
          requestedQty: 20.0,
          approvedQty: 20.0,
        },
      ],
    },
    {
      transferNumber: "TRF-2026-9003",
      fromStoreId: jabalpurStore.id,
      toStoreId: bhopalStore.id,
      status: "APPROVED_IN_TRANSIT",
      carrierName: "Gati-KWE Supply Chain",
      vehicleNumber: "MP-20-HA-3310",
      dispatchNoteNumber: "DN-2026-9003",
      dispatchedAt: subHours(now, 4),
      estimatedArrival: subHours(now, -4), // in ~4 hours
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Ops Lead",
      lines: [
        {
          productId: productsToUse[2 % productsToUse.length].id,
          requestedQty: 15.0,
          approvedQty: 15.0,
        },
      ],
    },
    {
      transferNumber: "TRF-2026-8001",
      fromStoreId: indoreStore.id,
      toStoreId: bhopalStore.id,
      status: "COMPLETED",
      carrierName: "Delhivery Surface Freight",
      vehicleNumber: "MP-09-TR-7821",
      dispatchNoteNumber: "DN-2026-8001",
      dispatchedAt: subDays(now, 4),
      estimatedArrival: subDays(now, 3),
      receivedAt: subDays(now, 3),
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Ops Lead",
      receivedBy: "Bhopal Store Manager",
      lines: [
        {
          productId: productsToUse[0].id,
          requestedQty: 25.0,
          approvedQty: 25.0,
          receivedQty: 25.0,
        },
      ],
    },
    {
      transferNumber: "TRF-2026-8002",
      fromStoreId: jabalpurStore.id,
      toStoreId: bhopalStore.id,
      status: "COMPLETED",
      carrierName: "V-Trans Logistics",
      vehicleNumber: "MP-04-CB-1122",
      dispatchNoteNumber: "DN-2026-8002",
      dispatchedAt: subDays(now, 7),
      estimatedArrival: subDays(now, 6),
      receivedAt: subDays(now, 6),
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Ops Lead",
      receivedBy: "Bhopal Store Manager",
      lines: [
        {
          productId: productsToUse[1 % productsToUse.length].id,
          requestedQty: 30.0,
          approvedQty: 30.0,
          receivedQty: 28.0, // 2 units damage shortfall
        },
      ],
    },
  ];

  // 2. Also seed transfers between peer stores in other regions
  const peerTransfers = [];
  const otherStores = allStores.filter((s) => s.id !== bhopalStore.id);
  for (let i = 0; i < 15; i++) {
    const from = otherStores[i % otherStores.length];
    const to = otherStores[(i + 1) % otherStores.length];
    const isCompleted = i % 2 === 0;
    const prod = productsToUse[i % productsToUse.length];

    peerTransfers.push({
      transferNumber: `TRF-2026-${7000 + i}`,
      fromStoreId: from.id,
      toStoreId: to.id,
      status: isCompleted ? "COMPLETED" : "APPROVED_IN_TRANSIT",
      carrierName: i % 2 === 0 ? "Delhivery Surface Freight" : "BlueDart Express Fleet",
      vehicleNumber: `MH-${12 + (i % 20)}-TR-${1000 + i * 43}`,
      dispatchNoteNumber: `DN-2026-${7000 + i}`,
      dispatchedAt: subDays(now, isCompleted ? (i % 7) + 2 : 1),
      estimatedArrival: isCompleted ? subDays(now, (i % 7) + 1) : subHours(now, -3),
      receivedAt: isCompleted ? subDays(now, (i % 7) + 1) : null,
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Ops Lead",
      receivedBy: isCompleted ? "Store Operations Manager" : null,
      lines: [
        {
          productId: prod.id,
          requestedQty: 12.0 + (i % 8),
          approvedQty: 12.0 + (i % 8),
          receivedQty: isCompleted ? 12.0 + (i % 8) : null,
        },
      ],
    });
  }

  const allSeedList = [...bhopalTransfers, ...peerTransfers];

  for (const t of allSeedList) {
    const existing = await prisma.stockTransfer.findUnique({
      where: { transferNumber: t.transferNumber },
    });
    if (!existing) {
      await prisma.stockTransfer.create({
        data: {
          transferNumber: t.transferNumber,
          fromStoreId: t.fromStoreId,
          toStoreId: t.toStoreId,
          status: t.status,
          carrierName: t.carrierName,
          vehicleNumber: t.vehicleNumber,
          dispatchNoteNumber: t.dispatchNoteNumber,
          dispatchedAt: t.dispatchedAt,
          estimatedArrival: t.estimatedArrival,
          receivedAt: t.receivedAt,
          requestedBy: t.requestedBy,
          approvedBy: t.approvedBy,
          receivedBy: t.receivedBy,
          lines: {
            create: t.lines.map((l) => ({
              productId: l.productId,
              requestedQty: l.requestedQty,
              approvedQty: l.approvedQty,
              receivedQty: (l as any).receivedQty ?? null,
            })),
          },
        },
      });
    }
  }

  console.log(`Successfully seeded ${allSeedList.length} stock transfers!`);
}

if (process.argv[1] && process.argv[1].includes("seed-transfers")) {
  seedRealisticStockTransfers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

