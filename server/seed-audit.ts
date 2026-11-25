import { prisma } from "./db";

export async function seedAuditLogs() {
  const users = await prisma.user.findMany();
  const stores = await prisma.store.findMany();
  const products = await prisma.product.findMany({ take: 10 });

  if (users.length === 0 || stores.length === 0) {
    console.log("Users or stores missing, skipping audit log seeding.");
    return;
  }

  const admin = users.find((u) => u.role === "ADMIN") || users[0];
  const regMgr = users.find((u) => u.role === "REGIONAL_MANAGER") || users[0];
  const storeMgr = users.find((u) => u.role === "STORE_MANAGER") || users[0];
  const bplStore = stores.find((s) => s.storeCode === "BPL-001") || stores[0];
  const indStore = stores.find((s) => s.storeCode === "IND-001") || stores[1] || stores[0];
  const blrStore = stores.find((s) => s.storeCode === "BLR-024") || stores[2] || stores[0];

  const p1 = products[0] || { id: "prod-001", sku: "SKU-1460", name: "Fortune Sunflower Oil 1L", sellingPrice: 187, mrp: 215 };
  const p2 = products[1] || { id: "prod-002", sku: "SKU-1476", name: "Maggi 2-Minute Noodles 280g", sellingPrice: 55, mrp: 63 };
  const p3 = products[2] || { id: "prod-003", sku: "SKU-1444", name: "Aashirvaad Superior MP Atta 10kg", sellingPrice: 318, mrp: 366 };

  const auditEvents = [
    {
      correlationId: "corr-audit-001",
      userId: admin.id,
      action: "UPDATE_USER",
      entityName: "users",
      entityId: storeMgr.id,
      oldValues: JSON.stringify({
        userId: storeMgr.id,
        role: "STORE_ASSOCIATE",
        assignedStoreIds: [],
        isActive: true,
      }),
      newValues: JSON.stringify({
        userId: storeMgr.id,
        role: "STORE_MANAGER",
        assignedStoreIds: [bplStore.id],
        storeCode: bplStore.storeCode,
        storeName: bplStore.name,
        regionId: bplStore.regionId,
        isActive: true,
      }),
      ipAddress: "192.168.1.10",
      timestamp: new Date("2026-10-30T11:45:00Z"),
    },
    {
      correlationId: "corr-audit-002",
      userId: storeMgr.id,
      action: "ADJUST_STOCK",
      entityName: "inventory",
      entityId: `inv-${bplStore.id}-${p1.id}`,
      oldValues: JSON.stringify({
        storeId: bplStore.id,
        storeCode: bplStore.storeCode,
        productId: p1.id,
        sku: p1.sku,
        productName: p1.name,
        availableQuantity: 42.0,
        reservedQuantity: 0.0,
        doi: 1.4,
      }),
      newValues: JSON.stringify({
        storeId: bplStore.id,
        storeCode: bplStore.storeCode,
        productId: p1.id,
        sku: p1.sku,
        productName: p1.name,
        availableQuantity: 40.0,
        adjustmentDelta: -2.0,
        reasonCode: "DAMAGED_WRITE_OFF",
        notes: "Carton dropped during rack replenishment in Aisle 4. Leaked oil written off.",
        doi: 1.33,
      }),
      ipAddress: "10.0.1.45",
      timestamp: new Date("2026-10-30T10:15:20Z"),
    },
    {
      correlationId: "corr-audit-003",
      userId: regMgr.id,
      action: "TRANSFER_APPROVE",
      entityName: "transfers",
      entityId: "rec-bhopal-indore-001",
      oldValues: JSON.stringify({
        recommendationNumber: "REC-20260725-0001",
        status: "GENERATED",
        fromStoreId: indStore.id,
        fromStoreCode: indStore.storeCode,
        toStoreId: bplStore.id,
        toStoreCode: bplStore.storeCode,
        recommendedQty: 25,
      }),
      newValues: JSON.stringify({
        recommendationNumber: "REC-20260725-0001",
        status: "APPROVED_IN_TRANSIT",
        fromStoreId: indStore.id,
        fromStoreCode: indStore.storeCode,
        toStoreId: bplStore.id,
        toStoreCode: bplStore.storeCode,
        approvedQty: 25,
        estimatedTransitHours: 3.9,
        actionType: "REBALANCE_TRANSFER",
        auditComment: "Approved peer donor transfer to avert weekend stockout at Bhopal store.",
      }),
      ipAddress: "192.168.2.14",
      timestamp: new Date("2026-10-29T16:30:10Z"),
    },
    {
      correlationId: "corr-audit-004",
      userId: storeMgr.id,
      action: "TRANSFER_RECEIVE",
      entityName: "transfers",
      entityId: "TRF-2026-0042",
      oldValues: JSON.stringify({
        transferNumber: "TRF-2026-0042",
        status: "APPROVED_IN_TRANSIT",
        destinationStoreId: bplStore.id,
        destinationStoreCode: bplStore.storeCode,
        shippedQty: 50,
      }),
      newValues: JSON.stringify({
        transferNumber: "TRF-2026-0042",
        status: "COMPLETED",
        destinationStoreId: bplStore.id,
        destinationStoreCode: bplStore.storeCode,
        receivedQty: 50,
        shortfallQty: 0,
        grnNumber: "GRN-2026-0891",
        vehicleNumber: "MP-04-HE-8921",
        carrier: "Blue Dart Surface Express",
      }),
      ipAddress: "10.0.1.45",
      timestamp: new Date("2026-10-29T14:10:00Z"),
    },
    {
      correlationId: "corr-audit-005",
      userId: admin.id,
      action: "UPDATE_PRODUCT",
      entityName: "products",
      entityId: p2.id,
      oldValues: JSON.stringify({
        productId: p2.id,
        sku: p2.sku,
        name: p2.name,
        sellingPrice: 52.0,
        mrp: 60.0,
        isActive: true,
      }),
      newValues: JSON.stringify({
        productId: p2.id,
        sku: p2.sku,
        name: p2.name,
        sellingPrice: 55.0,
        mrp: 63.0,
        priceRevisionReason: "FMCG Manufacturer MRP Revision - Q4 Inflation Adjustment",
        isActive: true,
      }),
      ipAddress: "192.168.1.10",
      timestamp: new Date("2026-10-28T09:20:45Z"),
    },
    {
      correlationId: "corr-audit-006",
      userId: admin.id,
      action: "SCD2_RULE_UPDATE",
      entityName: "rules",
      entityId: "rule-cat-edible-oil-001",
      oldValues: JSON.stringify({
        ruleCode: "RULE-EDIBLE-OIL-HYPER",
        categoryCode: "CAT-EDIBLE-OIL",
        minDOI: 3.0,
        targetDOI: 14.0,
        maxDOI: 30.0,
        version: 1,
      }),
      newValues: JSON.stringify({
        ruleCode: "RULE-EDIBLE-OIL-HYPER",
        categoryCode: "CAT-EDIBLE-OIL",
        minDOI: 4.0,
        targetDOI: 16.0,
        maxDOI: 35.0,
        version: 2,
        effectiveStartDate: "2026-10-27T00:00:00Z",
        changeReason: "Festive Diwali buffer increase across high-velocity staples.",
      }),
      ipAddress: "192.168.1.10",
      timestamp: new Date("2026-10-27T15:05:12Z"),
    },
    {
      correlationId: "corr-audit-007",
      userId: admin.id,
      action: "BULK_SKU_IMPORT",
      entityName: "products",
      entityId: "batch-import-20261026",
      oldValues: null,
      newValues: JSON.stringify({
        importType: "CSV_CATALOG_UPSERT",
        filename: "Master_SKU_Catalog_Oct2026.csv",
        totalRows: 21,
        insertedCount: 18,
        updatedCount: 3,
        failedCount: 0,
        importedBy: admin.email,
      }),
      ipAddress: "192.168.1.10",
      timestamp: new Date("2026-10-26T12:00:30Z"),
    },
    {
      correlationId: "corr-audit-008",
      userId: admin.id,
      action: "CREATE_STORE",
      entityName: "stores",
      entityId: blrStore.id,
      oldValues: null,
      newValues: JSON.stringify({
        storeId: blrStore.id,
        storeCode: blrStore.storeCode,
        name: blrStore.name,
        regionId: blrStore.regionId,
        format: "HYPERMARKET",
        city: "Bengaluru",
        state: "Karnataka",
        openingDate: "2026-11-01",
        status: "ACTIVE",
      }),
      ipAddress: "192.168.1.10",
      timestamp: new Date("2026-10-25T17:40:00Z"),
    },
    {
      correlationId: "corr-audit-009",
      userId: storeMgr.id,
      action: "ADJUST_STOCK",
      entityName: "inventory",
      entityId: `inv-${bplStore.id}-${p3.id}`,
      oldValues: JSON.stringify({
        storeId: bplStore.id,
        storeCode: bplStore.storeCode,
        productId: p3.id,
        sku: p3.sku,
        productName: p3.name,
        availableQuantity: 18.0,
      }),
      newValues: JSON.stringify({
        storeId: bplStore.id,
        storeCode: bplStore.storeCode,
        productId: p3.id,
        sku: p3.sku,
        productName: p3.name,
        availableQuantity: 22.0,
        adjustmentDelta: 4.0,
        reasonCode: "CYCLE_COUNT_SURPLUS",
        notes: "Physical floor count verified 4 extra bags found in back-storage row B.",
      }),
      ipAddress: "10.0.1.45",
      timestamp: new Date("2026-10-24T11:22:18Z"),
    },
    {
      correlationId: "corr-audit-010",
      userId: regMgr.id,
      action: "REJECT_RECOMMENDATION",
      entityName: "recommendations",
      entityId: "rec-indore-surplus-009",
      oldValues: JSON.stringify({
        recommendationNumber: "REC-20260724-0012",
        status: "GENERATED",
        recommendedQty: 100,
      }),
      newValues: JSON.stringify({
        recommendationNumber: "REC-20260724-0012",
        status: "REJECTED",
        auditComment: "Donor store holding seasonal promotion this weekend; inventory needed locally.",
      }),
      ipAddress: "192.168.2.14",
      timestamp: new Date("2026-10-23T16:15:00Z"),
    },
  ];

  for (const ev of auditEvents) {
    await prisma.auditLog.create({
      data: ev,
    });
  }

  console.log(`Successfully seeded ${auditEvents.length} enterprise audit logs.`);
}

if (process.argv[1] && process.argv[1].includes("seed-audit")) {
  seedAuditLogs()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

