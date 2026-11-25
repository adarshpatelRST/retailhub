import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveRecommendationAction,
  batchApproveRecommendationsAction,
  buildRecursiveCategoryTree,
  calculateDeterministicDOI,
  calculateHaversineDistanceKm,
  classifyDoiGaugeBar,
  classifyDoiRiskTier,
  classifyDoiStockStatus,
  computeDataScopeFilter,
  computeExecutiveDashboardAggregation,
  computeInventoryHealthStatus,
  computeRollingAdsVelocity,
  computeSalesSummary,
  computeStoreDashboardAggregation,
  computeStoreVelocityMap,
  createManualStoreRequestAction,
  evaluateIntelligenceRebalance,
  evaluateRolesGuard,
  evaluateWebSocketHandshakeAndRooms,
  executeCancelTransferState,
  executeDispatchTransferState,
  executeMasterSeedAndGoldenPathSimulation,
  executeOptimisticStockAdjustment,
  executePosSaleIngestion,
  executeReceiveTransferState,
  executeSimulatedSalesSpike,
  filterStoresByDataScope,
  generateDeterministicAiNarrative,
  getOrCreateLazyInventoryBalance,
  getStatusBadgeVariant,
  modifyRecommendationWithDoiGuard,
  onboardProductCatalogItem,
  projectStoreNetworkDirectory,
  rankRegionalDonorCandidates,
  rejectRecommendationAction,
  resolveHeaderStoreSwitcherScope,
  REVERSE_DEPENDENCY_PURGE_ORDER,
  sanitizeAuditPayloadWithReport,
  saveVersionedInventoryRule,
  searchProductsBarcodeFirst,
  simulatePipelineExecution,
  flattenCategoryTreeForCombobox,
  chunkCsvProductsBatch,
  validateProductValuePricing,
  groupStoreDirectoryByRegion,
  formatInventoryQty3Decimals,
  evaluateInwardScanAndShortfall,
  evaluateCycleCountProjectedStock,
  computeSideBySideComparisonMetrics,
  evaluateCandidateDonorSafetyFloor,
  computeBatchApprovalSummary,
  computeRoleScopedFilterCapabilities,
  computeSkuPerformanceRowMetrics,
  computeAuditJsonDiffKeys,
  type FlatCategoryRecord,
  type InventoryBalanceRecord,
  type ProductCatalogRecord,
  type RecommendationRecord,
  type StockTransferRecord,
  type StoreRecord,
  type UserIdentity,
} from './coreEngine';

const sampleStores: StoreRecord[] = [
  {
    id: 'store-mum-01',
    storeCode: 'DM-MUM-001',
    name: 'Powai Hypermarket',
    regionId: 'reg-west',
    regionCode: 'WEST-MH',
    regionName: 'Western Maharashtra',
    storeTypeCode: 'HYPERMARKET',
    city: 'Mumbai',
    address: 'Hiranandani Gardens, Powai, Mumbai 400076',
    latitude: 19.1176,
    longitude: 72.906,
    openingDate: '2021-04-15',
    isActive: true,
    skuCount: 18420,
    availableQuantityTotal: '42890.500',
    dailyPosRevenue: '6845200.00',
  },
  {
    id: 'store-pun-02',
    storeCode: 'DM-PUN-002',
    name: 'Baner Fulfilment Center',
    regionId: 'reg-west',
    regionCode: 'WEST-MH',
    regionName: 'Western Maharashtra',
    storeTypeCode: 'DARK_STORE',
    city: 'Pune',
    address: 'Baner Road, Pune 411045',
    latitude: 18.559,
    longitude: 73.7868,
    openingDate: '2022-08-10',
    isActive: true,
    skuCount: 12150,
    availableQuantityTotal: '29110.250',
    dailyPosRevenue: '3912450.50',
  },
  {
    id: 'store-blr-01',
    storeCode: 'JM-BLR-001',
    name: 'Whitefield Supercenter',
    regionId: 'reg-south',
    regionCode: 'SOUTH-KA',
    regionName: 'Karnataka South',
    storeTypeCode: 'HYPERMARKET',
    city: 'Bengaluru',
    address: 'ITPL Main Rd, Whitefield, Bengaluru 560066',
    latitude: 12.9698,
    longitude: 77.75,
    openingDate: '2020-11-01',
    isActive: true,
    skuCount: 21300,
    availableQuantityTotal: '51200.750',
    dailyPosRevenue: '7420100.75',
  },
];

const storeAssignments = [
  { id: 'usa-1', userId: 'usr-sm-1', storeId: 'store-mum-01' },
];

const regionAssignments = [
  { id: 'ura-1', userId: 'usr-rm-1', regionId: 'reg-west' },
];

const sampleProducts: ProductCatalogRecord[] = [
  {
    id: 'prod-1',
    sku: 'SKU-1024',
    productCode: '8901030383742',
    name: 'Daawat Rozana Super Basmati Rice 5kg',
    description: 'Aged everyday basmati rice',
    brandId: 'brd-daawat',
    brandName: 'Daawat',
    categoryId: 'cat-rice',
    categoryName: 'Rice & Grains',
    unitOfMeasure: 'PACK',
    costPrice: '310.00',
    sellingPrice: '389.00',
    mrp: '445.00',
    isActive: true,
    totalAvailableStock: '1420.000',
  },
  {
    id: 'prod-2',
    sku: 'SKU-1088',
    productCode: '8901063014220',
    name: 'Fortune Sunlite Refined Sunflower Oil 1L',
    description: 'Refined cooking oil pouch',
    brandId: 'brd-fortune',
    brandName: 'Fortune',
    categoryId: 'cat-oil',
    categoryName: 'Edible Oils & Ghee',
    unitOfMeasure: 'LITRE',
    costPrice: '118.00',
    sellingPrice: '139.00',
    mrp: '165.00',
    isActive: true,
    totalAvailableStock: '3280.000',
  },
];

test('DataScopeGuard scopes STORE_MANAGER strictly to assigned storeIds (default, store, and inventory targets)', () => {
  const storeManager: UserIdentity = {
    id: 'usr-sm-1',
    email: 'rajesh.sharma@retailhub.in',
    fullName: 'Rajesh Sharma',
    role: 'STORE_MANAGER',
    mobileNumber: '+919820112233',
    isActive: true,
  };

  const inventoryScope = computeDataScopeFilter(
    storeManager,
    storeAssignments,
    regionAssignments,
    'inventory',
  );
  assert.deepEqual(inventoryScope, { storeId: { in: ['store-mum-01'] } });

  const storeTargetScope = computeDataScopeFilter(
    storeManager,
    storeAssignments,
    regionAssignments,
    'store',
  );
  assert.deepEqual(storeTargetScope, { id: { in: ['store-mum-01'] } });

  const visibleStores = filterStoresByDataScope(sampleStores, storeTargetScope);
  assert.equal(visibleStores.length, 1);
  assert.equal(visibleStores[0].storeCode, 'DM-MUM-001');
});

test('DataScopeGuard scopes REGIONAL_MANAGER strictly to assigned regionIds', () => {
  const regionalManager: UserIdentity = {
    id: 'usr-rm-1',
    email: 'priya.nair@retailhub.in',
    fullName: 'Priya Nair',
    role: 'REGIONAL_MANAGER',
    mobileNumber: '+919820445566',
    isActive: true,
  };

  const scope = computeDataScopeFilter(
    regionalManager,
    storeAssignments,
    regionAssignments,
    'store',
  );
  assert.deepEqual(scope, { regionId: { in: ['reg-west'] } });

  const visibleStores = filterStoresByDataScope(sampleStores, scope);
  assert.equal(visibleStores.length, 2);
});

test('AuditInterceptor strips password, token, secret, and authorization recursively', () => {
  const rawBody = {
    inventoryId: 'inv-mum-001',
    quantity: '45.500',
    unitPrice: '249.00',
    password: 'PlainTextPassword!23',
    token: 'eyJhbGciOiJIUzI1NiJ9',
    secret: 'top-secret-hmac',
    authorization: 'Bearer secret-jwt',
  };

  const { sanitized, strippedKeys } = sanitizeAuditPayloadWithReport(rawBody);
  assert.equal(strippedKeys.length, 4);
  const obj = sanitized as Record<string, unknown>;
  assert.equal('password' in obj, false);
  assert.equal(obj.quantity, '45.500');
});

test('AllExceptionsFilter translates Prisma P2002 and P2025 into 409 and 404 envelopes', () => {
  const admin: UserIdentity = {
    id: 'usr-admin-1',
    email: 'ops.admin@retailhub.in',
    fullName: 'Ananya Deshmukh',
    role: 'ADMIN',
    mobileNumber: '+919820990011',
    isActive: true,
  };

  const p2002Result = simulatePipelineExecution({
    method: 'POST',
    path: '/api/v1/inventory/adjust',
    correlationIdHeader: 'corr-p2002-test',
    user: admin,
    simulateOutcome: 'PRISMA_P2002',
  });
  assert.equal(p2002Result.httpStatus, 409);

  const p2025Result = simulatePipelineExecution({
    method: 'PATCH',
    path: '/api/v1/inventory/inv-missing',
    correlationIdHeader: 'corr-p2025-test',
    user: admin,
    simulateOutcome: 'PRISMA_P2025',
  });
  assert.equal(p2025Result.httpStatus, 404);
});

test('RolesGuard authorizes only matching RoleType', () => {
  assert.equal(
    evaluateRolesGuard('REGIONAL_MANAGER', ['EXECUTIVE', 'REGIONAL_MANAGER'])
      .allowed,
    true,
  );
  assert.equal(
    evaluateRolesGuard('STORE_MANAGER', ['EXECUTIVE', 'ADMIN']).allowed,
    false,
  );
});

test('ProductService.findAll executes Barcode-First search before partial text fallback', () => {
  const barcodeResult = searchProductsBarcodeFirst(sampleProducts, {
    search: '8901030383742',
  });
  assert.equal(barcodeResult.strategy, 'EXACT_BARCODE_MATCH');
  assert.equal(barcodeResult.items[0].sku, 'SKU-1024');
});

test('ProductService.create enforces PROD_SKU_EXISTS / PROD_BARCODE_EXISTS and defaults mrp to sellingPrice', () => {
  const createdNoMrp = onboardProductCatalogItem(sampleProducts, {
    sku: 'SKU-2048',
    productCode: '8901111222333',
    name: 'Tata Salt Vacuum Evaporated 1kg',
    brandId: 'brd-tata',
    brandName: 'Tata Consumer',
    categoryId: 'cat-staples',
    categoryName: 'Grocery & Staples',
    unitOfMeasure: 'KG',
    costPrice: 21.5,
    sellingPrice: 26.0,
  });
  assert.equal(createdNoMrp.ok, true);
  if (createdNoMrp.ok) {
    assert.equal(createdNoMrp.product.mrp, '26.00');
  }
});

test('ProductService.getCategoriesTree builds recursive root and subCategories tree', () => {
  const flatCategories: FlatCategoryRecord[] = [
    {
      id: 'cat-root-grocery',
      code: 'CAT-GROCERY',
      name: 'Grocery & Staples',
      parentCategoryId: null,
      isActive: true,
    },
    {
      id: 'cat-sub-rice',
      code: 'CAT-RICE',
      name: 'Rice & Grains',
      parentCategoryId: 'cat-root-grocery',
      isActive: true,
    },
  ];
  const tree = buildRecursiveCategoryTree(flatCategories);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].subCategories[0].code, 'CAT-RICE');
});

test('StoreService.getNetworkDirectory returns peer store contacts without financial or inventory metrics', () => {
  const users: UserIdentity[] = [
    {
      id: 'usr-sm-1',
      email: 'rajesh.sharma@retailhub.in',
      fullName: 'Rajesh Sharma',
      role: 'STORE_MANAGER',
      mobileNumber: '+91-98201-12233',
      isActive: true,
    },
  ];
  const directory = projectStoreNetworkDirectory(
    sampleStores,
    users,
    storeAssignments,
  );
  assert.equal(directory.length, 3);
  assert.equal('dailyPosRevenue' in directory[0], false);
});

test('InventoryService computes dynamic stock status (CRITICAL, LOW, HEALTHY, EXCESS) and lazy balance initialization', () => {
  assert.equal(
    computeInventoryHealthStatus({
      availableQuantity: '0.000',
      reorderLevel: '20.000',
      maximumStock: '100.000',
    }),
    'CRITICAL',
  );
  assert.equal(
    computeInventoryHealthStatus({
      availableQuantity: '15.500',
      reorderLevel: '20.000',
      maximumStock: '100.000',
    }),
    'LOW',
  );
  assert.equal(
    computeInventoryHealthStatus({
      availableQuantity: '55.000',
      reorderLevel: '20.000',
      maximumStock: '100.000',
    }),
    'HEALTHY',
  );
  assert.equal(
    computeInventoryHealthStatus({
      availableQuantity: '125.000',
      reorderLevel: '20.000',
      maximumStock: '100.000',
    }),
    'EXCESS',
  );

  const lazy = getOrCreateLazyInventoryBalance([], {
    storeId: 'store-mum-01',
    storeCode: 'DM-MUM-001',
    storeName: 'Powai Hypermarket',
    productId: 'prod-1',
    sku: 'SKU-1024',
    productName: 'Daawat Basmati Rice 5kg',
  });
  assert.equal(lazy.createdLazily, true);
  assert.equal(lazy.balance.availableQuantity, '0.000');
  assert.equal(lazy.balance.version, 1);
});

test('InventoryService.adjustStock enforces optimistic locking (INV_CONCURRENCY_CONFLICT) and double-entry ledgering', () => {
  const initialBalances: InventoryBalanceRecord[] = [
    {
      id: 'inv-1',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1',
      sku: 'SKU-1024',
      productName: 'Daawat Basmati Rice 5kg',
      availableQuantity: '40.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '100.000',
      reorderLevel: '20.000',
      version: 3,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  // Stale expectedVersion -> INV_CONCURRENCY_CONFLICT
  const conflictRes = executeOptimisticStockAdjustment(initialBalances, [], {
    storeId: 'store-mum-01',
    productId: 'prod-1',
    quantityDelta: '-5.000',
    expectedVersion: 2,
    remarks: 'Broken bag write-off',
    userId: 'usr-sm-1',
  });
  assert.equal(conflictRes.ok, false);
  if (!conflictRes.ok) {
    assert.equal(conflictRes.errorCode, 'INV_CONCURRENCY_CONFLICT');
    assert.equal(conflictRes.statusCode, 409);
  }

  // Matching expectedVersion -> updates balance to 35.500, increments version to 4, records DAMAGED_WRITE_OFF
  const validRes = executeOptimisticStockAdjustment(initialBalances, [], {
    storeId: 'store-mum-01',
    productId: 'prod-1',
    quantityDelta: '-4.500',
    expectedVersion: 3,
    remarks: 'Broken bag write-off',
    userId: 'usr-sm-1',
  });
  assert.equal(validRes.ok, true);
  if (validRes.ok) {
    assert.equal(validRes.updatedBalance.availableQuantity, '35.500');
    assert.equal(validRes.updatedBalance.version, 4);
    assert.equal(validRes.movement.movementType, 'DAMAGED_WRITE_OFF');
    assert.equal(validRes.movement.quantity, '-4.500');
  }
});

test('TransferService executes 3-step state machine and automatically writes off short-shipment as DAMAGED_WRITE_OFF', () => {
  const initialBalances: InventoryBalanceRecord[] = [
    {
      id: 'inv-src',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1',
      sku: 'SKU-1024',
      productName: 'Daawat Basmati Rice 5kg',
      availableQuantity: '100.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '150.000',
      reorderLevel: '25.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const pendingTransfer: StockTransferRecord = {
    id: 'trf-101',
    transferNumber: 'TRF-849201',
    fromStoreId: 'store-mum-01',
    fromStoreCode: 'DM-MUM-001',
    toStoreId: 'store-pun-02',
    toStoreCode: 'DM-PUN-002',
    status: 'PENDING_APPROVAL',
    carrierName: null,
    vehicleNumber: null,
    dispatchNoteNumber: null,
    estimatedArrival: null,
    dispatchedAt: null,
    receivedAt: null,
    requestedBy: 'usr-sm-1',
    approvedBy: null,
    receivedBy: null,
    lines: [
      {
        id: 'line-1',
        productId: 'prod-1',
        sku: 'SKU-1024',
        productName: 'Daawat Basmati Rice 5kg',
        requestedQty: '30.000',
        approvedQty: '30.000',
        receivedQty: null,
      },
    ],
  };

  // Step 1 -> Step 2: Dispatch (100.000 available -> 70.000 available, 30.000 inTransit)
  const dispatched = executeDispatchTransferState(
    pendingTransfer,
    initialBalances,
    [],
    {
      carrierName: 'BlueDart Surface',
      vehicleNumber: 'MH-12-PQ-4410',
      dispatchNoteNumber: 'DN-9921',
      userId: 'usr-sm-1',
    },
  );
  assert.equal(dispatched.ok, true);
  if (!dispatched.ok) return;

  assert.equal(dispatched.transfer.status, 'APPROVED_IN_TRANSIT');
  assert.equal(dispatched.balances[0].availableQuantity, '70.000');
  assert.equal(dispatched.balances[0].inTransitQuantity, '30.000');
  assert.equal(dispatched.movements[0].movementType, 'TRANSFER_OUT_DISPATCH');

  // Step 2 -> Step 3: Receive with short-shipment (receivedQty = 28.000 < approvedQty = 30.000)
  const received = executeReceiveTransferState(
    dispatched.transfer,
    dispatched.balances,
    dispatched.movements,
    {
      receivedQuantitiesByProductId: { 'prod-1': '28.000' },
      remarks: '2 packs damaged during transit unloading',
      userId: 'usr-sm-pun',
    },
  );
  assert.equal(received.ok, true);
  if (!received.ok) return;

  assert.equal(received.transfer.status, 'RECEIVED');
  // Source store inTransitQuantity cleared to 0.000
  const srcAfter = received.balances.find(
    (b) => b.storeId === 'store-mum-01',
  )!;
  assert.equal(srcAfter.inTransitQuantity, '0.000');

  // Destination store lazily initialized and credited with 28.000
  const destAfter = received.balances.find(
    (b) => b.storeId === 'store-pun-02',
  )!;
  assert.equal(destAfter.availableQuantity, '28.000');

  // Verify both TRANSFER_IN_RECEIPT (+28.000) and DAMAGED_WRITE_OFF (-2.000) movements were recorded
  const writeOffMov = received.movements.find(
    (m) => m.movementType === 'DAMAGED_WRITE_OFF',
  );
  assert.ok(writeOffMov);
  assert.equal(writeOffMov.quantity, '-2.000');

  const receiptMov = received.movements.find(
    (m) => m.movementType === 'TRANSFER_IN_RECEIPT',
  );
  assert.ok(receiptMov);
  assert.equal(receiptMov.quantity, '28.000');
});

test('TransferService.cancelTransfer reverses in-transit stock when cancelling APPROVED_IN_TRANSIT transfer', () => {
  const balances: InventoryBalanceRecord[] = [
    {
      id: 'inv-src',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1',
      sku: 'SKU-1024',
      productName: 'Daawat Basmati Rice 5kg',
      availableQuantity: '70.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '30.000',
      minimumStock: '10.000',
      maximumStock: '150.000',
      reorderLevel: '25.000',
      version: 2,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const inTransitTransfer: StockTransferRecord = {
    id: 'trf-102',
    transferNumber: 'TRF-849202',
    fromStoreId: 'store-mum-01',
    fromStoreCode: 'DM-MUM-001',
    toStoreId: 'store-pun-02',
    toStoreCode: 'DM-PUN-002',
    status: 'APPROVED_IN_TRANSIT',
    carrierName: 'Mahindra Logistics',
    vehicleNumber: 'MH-04-8821',
    dispatchNoteNumber: 'DN-102',
    estimatedArrival: null,
    dispatchedAt: '2026-10-26T08:15:00.000Z',
    receivedAt: null,
    requestedBy: 'usr-sm-1',
    approvedBy: 'usr-sm-1',
    receivedBy: null,
    lines: [
      {
        id: 'line-1',
        productId: 'prod-1',
        sku: 'SKU-1024',
        productName: 'Daawat Basmati Rice 5kg',
        requestedQty: '30.000',
        approvedQty: '30.000',
        receivedQty: null,
      },
    ],
  };

  const cancelled = executeCancelTransferState(inTransitTransfer, balances, [], {
    userId: 'usr-rm-1',
    reason: 'Highway closure; recalled to Powai hub',
  });
  assert.equal(cancelled.ok, true);
  if (cancelled.ok) {
    assert.equal(cancelled.transfer.status, 'CANCELLED');
    assert.equal(cancelled.balances[0].availableQuantity, '100.000');
    assert.equal(cancelled.balances[0].inTransitQuantity, '0.000');
    assert.equal(cancelled.movements[0].movementType, 'STOCK_ADJUSTMENT');
    assert.equal(cancelled.movements[0].quantity, '30.000');
  }
});

test('InventoryService.saveRule enforces SCD Type 2 effective-date versioning', () => {
  const first = saveVersionedInventoryRule([], {
    storeId: 'store-mum-01',
    storeCode: 'DM-MUM-001',
    productId: 'prod-1',
    sku: 'SKU-1024',
    minimumStock: 10,
    maximumStock: 100,
    reorderLevel: 20,
    safetyStock: 8,
  });
  assert.equal(first.createdRule.version, 1);
  assert.equal(first.createdRule.isActive, true);

  const second = saveVersionedInventoryRule(first.rules, {
    storeId: 'store-mum-01',
    storeCode: 'DM-MUM-001',
    productId: 'prod-1',
    sku: 'SKU-1024',
    minimumStock: 25,
    maximumStock: 180,
    reorderLevel: 45,
    safetyStock: 15,
  });
  assert.equal(second.createdRule.version, 2);
  assert.equal(second.createdRule.isActive, true);
  assert.equal(second.rules[1].isActive, false);
  assert.ok(second.rules[1].effectiveTo !== null);
});

test('SalesService.createSale snapshots point-in-time prices, decrements stock into negative without blocking checkout, and blocks duplicate transactionNumber', () => {
  const initialBalances: InventoryBalanceRecord[] = [
    {
      id: 'inv-mum1-1024',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Basmati Rice 5kg',
      availableQuantity: '3.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '100.000',
      reorderLevel: '20.000',
      version: 2,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  // Sell 5.000 units when only 3.000 are on shelf -> must succeed and record -2.000 negative stock
  const saleRes = executePosSaleIngestion([], initialBalances, [], {
    transactionNumber: 'POS-MUM-20261026-0001',
    storeId: 'store-mum-01',
    storeCode: 'DM-MUM-001',
    storeName: 'Powai Hypermarket',
    transactionDate: '2026-10-26T09:00:00.000Z',
    customerId: '+91-9820112233',
    lines: [
      {
        productId: 'prod-1024',
        sku: 'SKU-1024',
        productName: 'Daawat Basmati Rice 5kg',
        quantity: '5.000',
        unitPrice: '389.00',
        discount: '10.00',
        netAmount: '1935.00',
      },
    ],
  });

  assert.equal(saleRes.ok, true);
  if (!saleRes.ok) return;

  assert.equal(saleRes.transaction.totalQuantity, '5.000');
  assert.equal(saleRes.transaction.totalAmount, '1935.00');
  assert.equal(saleRes.transaction.lines[0].unitPrice, '389.00');
  assert.equal(saleRes.transaction.lines[0].discount, '10.00');
  assert.equal(saleRes.transaction.lines[0].netAmount, '1935.00');

  // Stock dropped from 3.000 to -2.000, version incremented 2 -> 3, negative alert emitted
  assert.equal(saleRes.balances[0].availableQuantity, '-2.000');
  assert.equal(saleRes.balances[0].version, 3);
  assert.equal(saleRes.negativeStockAlerts.length, 1);
  assert.equal(
    saleRes.negativeStockAlerts[0].availableQuantityAfterSale,
    '-2.000',
  );

  // Movement logged with POS_SALE and -5.000
  assert.equal(saleRes.movements[0].movementType, 'POS_SALE');
  assert.equal(saleRes.movements[0].quantity, '-5.000');
  assert.equal(saleRes.movements[0].createdBy, 'POS_TERMINAL');

  // Duplicate transactionNumber must fail with SALES_DUPLICATE_TX (409)
  const dupRes = executePosSaleIngestion(
    saleRes.transactions,
    saleRes.balances,
    saleRes.movements,
    {
      transactionNumber: 'POS-MUM-20261026-0001',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      lines: [
        {
          productId: 'prod-1024',
          sku: 'SKU-1024',
          productName: 'Daawat Basmati Rice 5kg',
          quantity: '1.000',
          unitPrice: '389.00',
          netAmount: '389.00',
        },
      ],
    },
  );
  assert.equal(dupRes.ok, false);
  if (!dupRes.ok) {
    assert.equal(dupRes.errorCode, 'SALES_DUPLICATE_TX');
    assert.equal(dupRes.statusCode, 409);
  }
});

test('VelocityService computes rolling Average Daily Sales (ADS), handles zero-sales safely as 0.000, and builds store velocity map', () => {
  const refIso = '2026-10-26T12:00:00.000Z';
  const txList = [
    {
      id: 'sal-1',
      transactionNumber: 'POS-01',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      transactionDate: '2026-10-20T10:00:00.000Z',
      customerId: null,
      totalQuantity: '60.000',
      totalAmount: '23340.00',
      lines: [
        {
          id: 'ln-1',
          productId: 'prod-1024',
          sku: 'SKU-1024',
          productName: 'Daawat Basmati Rice 5kg',
          quantity: '60.000',
          unitPrice: '389.00',
          discount: '0.00',
          netAmount: '23340.00',
        },
      ],
    },
    {
      id: 'sal-2',
      transactionNumber: 'POS-02',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      transactionDate: '2026-10-25T10:00:00.000Z',
      customerId: null,
      totalQuantity: '30.000',
      totalAmount: '4170.00',
      lines: [
        {
          id: 'ln-2',
          productId: 'prod-1088',
          sku: 'SKU-1088',
          productName: 'Fortune Sunflower Oil 1L',
          quantity: '30.000',
          unitPrice: '139.00',
          discount: '0.00',
          netAmount: '4170.00',
        },
      ],
    },
  ];

  // 60 units over 30 days = 2.000 ADS
  const ads30 = computeRollingAdsVelocity(
    txList,
    'store-mum-01',
    'prod-1024',
    30,
    refIso,
  );
  assert.equal(ads30, 2);

  // Zero sales for an unsold SKU -> explicitly returns 0 (0.000) without NaN/Infinity
  const adsZero = computeRollingAdsVelocity(
    txList,
    'store-mum-01',
    'prod-unseen',
    30,
    refIso,
  );
  assert.equal(adsZero, 0);
  assert.equal(adsZero.toFixed(3), '0.000');

  // Store velocity map groups all sold SKUs in a single pass
  const map = computeStoreVelocityMap(txList, 'store-mum-01', 30, refIso);
  assert.equal(map['prod-1024'], 2);
  assert.equal(map['prod-1088'], 1);

  // Summary KPIs
  const summary = computeSalesSummary(txList, { storeId: 'store-mum-01' });
  assert.equal(summary.totalRevenue, '27510.00');
  assert.equal(summary.totalUnitsSold, '90.000');
  assert.equal(summary.totalTransactionCount, 2);
  assert.equal(summary.averageBasketValue, '13755.00');
});

test('SimulationService.triggerSalesSpike generates synthetic SIM-SPIKE receipt, depletes store stock, and updates rolling ADS', () => {
  const sampleProducts: ProductCatalogRecord[] = [
    {
      id: 'prod-1024',
      sku: 'SKU-1024',
      productCode: '8901030383742',
      name: 'Daawat Basmati Rice 5kg',
      description: 'Basmati rice',
      brandId: 'brd-1',
      brandName: 'Daawat',
      categoryId: 'cat-1',
      categoryName: 'Staples',
      unitOfMeasure: 'PACK',
      costPrice: '310.00',
      sellingPrice: '389.00',
      mrp: '445.00',
      isActive: true,
      totalAvailableStock: '50.000',
    },
  ];

  const initialBalances: InventoryBalanceRecord[] = [
    {
      id: 'inv-mum1-1024',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Basmati Rice 5kg',
      availableQuantity: '50.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '15.000',
      maximumStock: '120.000',
      reorderLevel: '30.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const spikeRes = executeSimulatedSalesSpike(
    [],
    initialBalances,
    [],
    sampleProducts,
    sampleStores,
    {
      storeId: 'store-mum-01',
      productId: 'prod-1024',
      unitsToSell: 30,
      timestampMs: 1761476400000,
    },
  );

  assert.equal(spikeRes.ok, true);
  if (spikeRes.ok) {
    assert.equal(
      spikeRes.transaction.transactionNumber,
      'SIM-SPIKE-1761476400000',
    );
    assert.equal(spikeRes.transaction.totalAmount, '11670.00');
    assert.equal(spikeRes.updatedBalance.availableQuantity, '20.000');
    assert.equal(spikeRes.updatedBalance.version, 2);
    assert.equal(spikeRes.isNegativeStock, false);
    assert.equal(spikeRes.rolling30DayAds, 1);
  }
});

test('DoiService computes deterministic DOI (including 999.0 dormant and 0.0 depleted), risk tiers, and status buffers', () => {
  // Normal DOI = 25 / 10 = 2.50 -> HIGH risk
  assert.equal(calculateDeterministicDOI(25, 10), 2.5);
  assert.equal(classifyDoiRiskTier(2.5), 'HIGH');

  // Dormant / Dead stock: ADS == 0 and Available > 0 -> 999.0 -> LOW risk, EXCESS status
  assert.equal(calculateDeterministicDOI(40, 0), 999.0);
  assert.equal(classifyDoiRiskTier(999.0), 'LOW');
  assert.equal(classifyDoiStockStatus(40, 20, 100, 999.0), 'EXCESS');

  // Depleted / Negative stock -> DOI = 0.0 -> HIGH risk, CRITICAL status
  assert.equal(calculateDeterministicDOI(0, 5), 0.0);
  assert.equal(calculateDeterministicDOI(-4, 5), 0.0);
  assert.equal(classifyDoiStockStatus(-4, 20, 100, 0.0), 'CRITICAL');

  // MEDIUM risk (3.0 < DOI <= 7.0)
  assert.equal(classifyDoiRiskTier(5.5), 'MEDIUM');
  assert.equal(classifyDoiStockStatus(55, 20, 100, 5.5), 'HEALTHY');
});

test('CandidateRankingService restricts to same region, enforces 7-day donor DOI safety clamping, and breaks ties by Haversine distance', () => {
  const storesForRanking: StoreRecord[] = [
    {
      id: 'store-dest-mum',
      storeCode: 'JM-MUM-002',
      name: 'Andheri Quick Hub',
      regionId: 'reg-west',
      regionCode: 'WEST-MH',
      regionName: 'Western Maharashtra',
      storeTypeCode: 'SUPERMARKET',
      city: 'Mumbai',
      latitude: 19.1136,
      longitude: 72.8697,
      openingDate: '2022-01-01',
      isActive: true,
      skuCount: 100,
      availableQuantityTotal: '1000.000',
      dailyPosRevenue: '100000.00',
    },
    {
      id: 'store-donor-powai',
      storeCode: 'DM-MUM-001',
      name: 'Powai Hypermarket (Closer)',
      regionId: 'reg-west',
      regionCode: 'WEST-MH',
      regionName: 'Western Maharashtra',
      storeTypeCode: 'HYPERMARKET',
      city: 'Mumbai',
      latitude: 19.1176,
      longitude: 72.906,
      openingDate: '2021-01-01',
      isActive: true,
      skuCount: 100,
      availableQuantityTotal: '5000.000',
      dailyPosRevenue: '500000.00',
    },
    {
      id: 'store-donor-pune',
      storeCode: 'DM-PUN-003',
      name: 'Hinjewadi Supercenter (Farther)',
      regionId: 'reg-west',
      regionCode: 'WEST-MH',
      regionName: 'Western Maharashtra',
      storeTypeCode: 'HYPERMARKET',
      city: 'Pune',
      latitude: 18.5913,
      longitude: 73.7389,
      openingDate: '2021-06-01',
      isActive: true,
      skuCount: 100,
      availableQuantityTotal: '5000.000',
      dailyPosRevenue: '450000.00',
    },
    {
      id: 'store-other-region',
      storeCode: 'JM-BLR-005',
      name: 'Whitefield Out-of-Region',
      regionId: 'reg-south',
      regionCode: 'SOUTH-KA',
      regionName: 'Karnataka South',
      storeTypeCode: 'HYPERMARKET',
      city: 'Bengaluru',
      latitude: 12.9698,
      longitude: 77.75,
      openingDate: '2021-01-01',
      isActive: true,
      skuCount: 100,
      availableQuantityTotal: '9000.000',
      dailyPosRevenue: '800000.00',
    },
  ];

  // Both Powai and Pune have identical stock (100.000), minStock (20.000), and ADS (2.0 -> DOI = 50.0 > 30.0)
  // 7-day protection floor: maxSafeTransfer = Math.floor(100 - 7 * 2.0) = 86 (or 80 above minStock=20)
  const balances: InventoryBalanceRecord[] = [
    {
      id: 'inv-powai',
      storeId: 'store-donor-powai',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '100.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '80.000',
      reorderLevel: '25.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
    {
      id: 'inv-pune',
      storeId: 'store-donor-pune',
      storeCode: 'DM-PUN-003',
      storeName: 'Hinjewadi Supercenter',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '100.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '80.000',
      reorderLevel: '25.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
    {
      id: 'inv-blr',
      storeId: 'store-other-region',
      storeCode: 'JM-BLR-005',
      storeName: 'Whitefield Out-of-Region',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '500.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '100.000',
      reorderLevel: '25.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const adsMap = {
    'store-donor-powai:prod-1024': 2.0,
    'store-donor-pune:prod-1024': 2.0,
    'store-other-region:prod-1024': 1.0,
  };

  const candidates = rankRegionalDonorCandidates({
    destStoreId: 'store-dest-mum',
    regionId: 'reg-west',
    productId: 'prod-1024',
    targetUnitsNeeded: 90,
    stores: storesForRanking,
    balances,
    adsByStoreAndProduct: adsMap,
  });

  // Out-of-region store (Bengaluru) must be excluded; only 2 regional candidates returned
  assert.equal(candidates.length, 2);

  // Both have suitabilityScore = 100.00, so primary tie-breaker (shortest Haversine distanceKm) wins:
  // Powai (~3.84 km) ranks #1 ahead of Pune (~108.4 km)
  assert.equal(candidates[0].storeCode, 'DM-MUM-001');
  assert.equal(candidates[0].rank, 1);
  assert.equal(candidates[1].storeCode, 'DM-PUN-003');
  assert.equal(candidates[1].rank, 2);
  assert.ok(candidates[0].distanceKm < candidates[1].distanceKm);

  // 7-day protection clamping: 100 - (7 * 2.0) = 86 (strictly > 7.0 days post-transfer DOI -> 85 units maxSafeTransfer so postTransferDOI = 7.50d > 7.0d)
  assert.ok(candidates[0].postTransferDOI > 7.0);
  assert.equal(
    calculateHaversineDistanceKm(null, undefined, 19.1, 72.8),
    999.0,
  );
});

test('RebalanceService orchestrates 14-day horizon, Central Supply fallback, deduplication, and AUTO_EXPIRED recovery', () => {
  const stores: StoreRecord[] = [
    {
      id: 'store-andheri',
      storeCode: 'JM-MUM-002',
      name: 'Andheri Quick Hub',
      regionId: 'reg-west',
      regionCode: 'WEST-MH',
      regionName: 'Western Maharashtra',
      storeTypeCode: 'SUPERMARKET',
      city: 'Mumbai',
      latitude: 19.1136,
      longitude: 72.8697,
      openingDate: '2022-01-01',
      isActive: true,
      skuCount: 100,
      availableQuantityTotal: '100.000',
      dailyPosRevenue: '100000.00',
    },
  ];

  // Stock = 10.000, ADS = 5.0 -> DOI = 2.00d (HIGH risk)
  // 14-day target horizon = Math.ceil((14.0 * 5.0) - 10.0) = 60 units
  // No regional donor exists -> must generate REORDER with fromStoreId = null
  const lowBalances: InventoryBalanceRecord[] = [
    {
      id: 'inv-andheri-1024',
      storeId: 'store-andheri',
      storeCode: 'JM-MUM-002',
      storeName: 'Andheri Quick Hub',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '10.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '15.000',
      maximumStock: '120.000',
      reorderLevel: '25.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const firstRun = evaluateIntelligenceRebalance({
    targetStoreIds: ['store-andheri'],
    stores,
    balances: lowBalances,
    existingRecommendations: [],
    adsByStoreAndProduct: { 'store-andheri:prod-1024': 5.0 },
  });

  assert.equal(firstRun.result.highRiskDetected, 1);
  assert.equal(firstRun.result.newRecommendationsCreated, 1);
  assert.equal(firstRun.recommendations.length, 1);
  assert.equal(firstRun.recommendations[0].recommendationType, 'REORDER');
  assert.equal(firstRun.recommendations[0].fromStoreId, null);
  assert.equal(firstRun.recommendations[0].recommendedQuantity, '60.000');

  // Re-running evaluation while rec is OPEN must deduplicate (refresh existing instead of creating duplicate)
  const secondRun = evaluateIntelligenceRebalance({
    targetStoreIds: ['store-andheri'],
    stores,
    balances: lowBalances,
    existingRecommendations: firstRun.recommendations,
    adsByStoreAndProduct: { 'store-andheri:prod-1024': 5.0 },
  });
  assert.equal(secondRun.result.newRecommendationsCreated, 0);
  assert.equal(secondRun.result.existingRecommendationsRefreshed, 1);
  assert.equal(secondRun.recommendations.length, 1);

  // Now simulate inward receipt restoring Andheri stock to 75.000 (DOI = 15.0d -> HEALTHY)
  // Re-running evaluation must auto-expire the OPEN recommendation to AUTO_EXPIRED
  const recoveredBalances: InventoryBalanceRecord[] = [
    {
      ...lowBalances[0],
      availableQuantity: '75.000',
    },
  ];
  const thirdRun = evaluateIntelligenceRebalance({
    targetStoreIds: ['store-andheri'],
    stores,
    balances: recoveredBalances,
    existingRecommendations: secondRun.recommendations,
    adsByStoreAndProduct: { 'store-andheri:prod-1024': 5.0 },
  });
  assert.equal(thirdRun.result.autoExpiredCount, 1);
  assert.equal(thirdRun.recommendations[0].status, 'AUTO_EXPIRED');
});

test('AiModule TemplateFallbackProvider generates grounded narratives for Regional Transfer and Central Supply Fallback', () => {
  const regionalNarrative = generateDeterministicAiNarrative({
    recommendationId: 'rec-901',
    recommendationType: 'REBALANCE_TRANSFER',
    priority: 'HIGH',
    productName: 'Daawat Rozana Super Basmati Rice 5kg',
    sku: 'SKU-1024',
    recommendedQuantity: 58,
    destStoreName: 'Andheri East Quick-Fulfilment Hub',
    destStoreCode: 'JM-MUM-002',
    destAvailableStock: 12.5,
    destADS: 5.0,
    destCurrentDOI: 2.5,
    destTargetDOI: 14,
    sourceStoreName: 'Powai High-Velocity Hypermarket',
    sourceStoreCode: 'DM-MUM-001',
    sourceAvailableStock: 145,
    sourceADS: 2.0,
    sourceCurrentDOI: 72.5,
    sourcePostTransferDOI: 43.5,
    distanceKm: 3.84,
  });

  assert.ok(regionalNarrative.includes('JM-MUM-002'));
  assert.ok(regionalNarrative.includes('2.5-day inventory cover'));
  assert.ok(regionalNarrative.includes('DM-MUM-001, 3.84 km away'));
  assert.ok(regionalNarrative.includes('from 72.5 days to 43.5 days'));
  assert.ok(regionalNarrative.includes('7-day protection threshold'));

  const centralNarrative = generateDeterministicAiNarrative({
    recommendationId: 'rec-902',
    recommendationType: 'CENTRAL_SUPPLY_ORDER',
    priority: 'CRITICAL',
    productName: 'Maggi 2-Minute Masala Noodles 560g',
    sku: 'SKU-1102',
    recommendedQuantity: 56,
    destStoreName: 'Hinjewadi Supercenter',
    destStoreCode: 'DM-PUN-003',
    destAvailableStock: 0,
    destADS: 4.0,
    destCurrentDOI: 0.0,
    destTargetDOI: 14,
    sourceStoreName: null,
    sourceStoreCode: null,
  });

  assert.ok(centralNarrative.includes('DM-PUN-003'));
  assert.ok(centralNarrative.includes('30-day overstock threshold'));
  assert.ok(
    centralNarrative.includes(
      'Central Warehouse replenishment order of 56 units',
    ),
  );
});

test('ActionCenterService.approve handles Regional Transfer (APPROVED_IN_TRANSIT + TRANSFER_OUT_DISPATCH) and Central Supply (INWARD_RECEIPT)', () => {
  const balances: InventoryBalanceRecord[] = [
    {
      id: 'inv-powai-1024',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '145.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '25.000',
      maximumStock: '120.000',
      reorderLevel: '40.000',
      version: 3,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
    {
      id: 'inv-andheri-1024',
      storeId: 'store-mum-02',
      storeCode: 'JM-MUM-002',
      storeName: 'Andheri Quick Hub',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '12.500',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '15.000',
      maximumStock: '100.000',
      reorderLevel: '25.000',
      version: 2,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const regionalRec: RecommendationRecord = {
    id: 'rec-reg-1',
    recommendationNumber: 'REC-101',
    recommendationType: 'STOCK_TRANSFER',
    storeId: 'store-mum-02',
    storeCode: 'JM-MUM-002',
    storeName: 'Andheri Quick Hub',
    regionId: 'reg-west',
    productId: 'prod-1024',
    sku: 'SKU-1024',
    productName: 'Daawat Rice 5kg',
    fromStoreId: 'store-mum-01',
    fromStoreCode: 'DM-MUM-001',
    toStoreId: 'store-mum-02',
    recommendedQuantity: '45.000',
    priority: 'HIGH',
    reason: 'Regional transfer',
    status: 'OPEN',
    updatedAt: '2026-10-26T06:00:00.000Z',
    evidence: [],
  };

  // 1. Approve Regional Transfer -> Donor availableQuantity drops 145 -> 100, inTransit increments 0 -> 45, transfer APPROVED_IN_TRANSIT created
  const regApproved = approveRecommendationAction({
    recommendation: regionalRec,
    balances,
    transfers: [],
    movements: [],
    actions: [],
    comments: 'Approved by Regional Manager',
    userId: 'usr-rm-west',
  });

  assert.equal(regApproved.ok, true);
  if (!regApproved.ok) return;

  assert.equal(regApproved.recommendation.status, 'COMPLETED');
  assert.ok(regApproved.createdTransfer !== null);
  assert.equal(regApproved.createdTransfer?.status, 'APPROVED_IN_TRANSIT');
  const donorAfter = regApproved.balances.find(
    (b) => b.storeId === 'store-mum-01',
  )!;
  assert.equal(donorAfter.availableQuantity, '100.000');
  assert.equal(donorAfter.inTransitQuantity, '45.000');
  assert.equal(donorAfter.version, 4);
  assert.equal(regApproved.movements[0].movementType, 'TRANSFER_OUT_DISPATCH');
  assert.equal(regApproved.actionRecord.actionType, 'APPROVE');
  assert.equal(regApproved.actionRecord.history[0].previousStatus, 'OPEN');
  assert.equal(regApproved.actionRecord.history[0].newStatus, 'COMPLETED');

  // 2. Approve Central Supply Fallback (fromStoreId === null) -> Destination availableQuantity increments directly
  const centralRec: RecommendationRecord = {
    ...regionalRec,
    id: 'rec-cs-2',
    recommendationNumber: 'REC-102',
    recommendationType: 'REORDER',
    fromStoreId: null,
    fromStoreCode: null,
    recommendedQuantity: '60.000',
    status: 'OPEN',
  };

  const csApproved = approveRecommendationAction({
    recommendation: centralRec,
    balances: regApproved.balances,
    transfers: regApproved.transfers,
    movements: regApproved.movements,
    actions: regApproved.actions,
    comments: 'Central warehouse dispatch approved',
    userId: 'usr-rm-west',
  });

  assert.equal(csApproved.ok, true);
  if (!csApproved.ok) return;

  assert.equal(csApproved.createdTransfer, null);
  const destAfter = csApproved.balances.find(
    (b) => b.storeId === 'store-mum-02',
  )!;
  // 12.500 + 60.000 = 72.500
  assert.equal(destAfter.availableQuantity, '72.500');
  assert.equal(csApproved.movements[0].movementType, 'INWARD_RECEIPT');
  assert.equal(csApproved.movements[0].referenceType, 'CENTRAL_SUPPLY');
});

test('ActionCenterService.modify enforces 7-Day Source DOI Protection floor and mandatory comments, and reject/createStoreRequest work end-to-end', () => {
  const balances: InventoryBalanceRecord[] = [
    {
      id: 'inv-powai-1024',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Daawat Rice 5kg',
      availableQuantity: '100.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '20.000',
      maximumStock: '120.000',
      reorderLevel: '35.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const openRec: RecommendationRecord = {
    id: 'rec-mod-1',
    recommendationNumber: 'REC-501',
    recommendationType: 'STOCK_TRANSFER',
    storeId: 'store-pun-02',
    storeCode: 'DM-PUN-002',
    storeName: 'Baner Fulfilment Center',
    regionId: 'reg-west',
    productId: 'prod-1024',
    sku: 'SKU-1024',
    productName: 'Daawat Rice 5kg',
    fromStoreId: 'store-mum-01',
    fromStoreCode: 'DM-MUM-001',
    toStoreId: 'store-pun-02',
    recommendedQuantity: '40.000',
    priority: 'HIGH',
    reason: 'Regional transfer',
    status: 'OPEN',
    updatedAt: '2026-10-26T06:00:00.000Z',
    evidence: [
      {
        metric: 'SRC_POST_TRANSFER_DOI',
        value: '30.00',
        description: 'Post-transfer DOI',
      },
    ],
  };

  // Donor stock = 100, donor ADS = 2.0 -> 7-day floor requires postTransferStock > 14 (i.e., modifiedQuantity < 86)
  // Attempting modifiedQuantity = 90 drops donor post-transfer DOI to (100 - 90) / 2.0 = 5.0 days <= 7.0 -> must fail!
  const violatedMod = modifyRecommendationWithDoiGuard({
    recommendation: openRec,
    balances,
    adsByStoreAndProduct: { 'store-mum-01:prod-1024': 2.0 },
    stores: sampleStores,
    actions: [],
    modifiedQuantity: 90,
    comments: 'Attempting to pull 90 units for weekend promo',
    userId: 'usr-rm-west',
  });
  assert.equal(violatedMod.ok, false);
  if (!violatedMod.ok) {
    assert.equal(violatedMod.errorCode, 'DOI_SAFETY_FLOOR_VIOLATED');
    assert.equal(violatedMod.projectedPostTransferDOI, 5.0);
  }

  // Valid modification: modifiedQuantity = 50 -> postTransferDOI = (100 - 50) / 2.0 = 25.0 days > 7.0 -> succeeds and transitions to MODIFIED
  const validMod = modifyRecommendationWithDoiGuard({
    recommendation: openRec,
    balances,
    adsByStoreAndProduct: { 'store-mum-01:prod-1024': 2.0 },
    stores: sampleStores,
    actions: [],
    modifiedQuantity: 50,
    comments: 'Adjusted to 50 units to fit 1 pallet load',
    userId: 'usr-rm-west',
  });
  assert.equal(validMod.ok, true);
  if (validMod.ok) {
    assert.equal(validMod.recommendation.status, 'MODIFIED');
    assert.equal(validMod.recommendation.recommendedQuantity, '50.000');
    assert.equal(validMod.postTransferDOI, 25.0);
    assert.equal(validMod.actionRecord.actionType, 'MODIFY');
  }

  // Reject recommendation -> transitions to REJECTED with mandatory reason
  const rejected = rejectRecommendationAction({
    recommendation: openRec,
    actions: [],
    reason: 'Direct supplier delivery scheduled for tomorrow morning',
    userId: 'usr-sm-powai',
  });
  assert.equal(rejected.ok, true);
  if (rejected.ok) {
    assert.equal(rejected.recommendation.status, 'REJECTED');
    assert.equal(rejected.actionRecord.actionType, 'REJECT');
  }

  // Manual Store Request -> creates MANUAL_STORE_REQUEST and auto-ranks Powai as #1 regional donor
  const manualReq = createManualStoreRequestAction({
    toStoreId: 'store-pun-02',
    productId: 'prod-1024',
    requestedQuantity: 35,
    priority: 'HIGH',
    reason: 'Local festival footfall surge expected this weekend',
    userEmail: 'rajesh.sharma@retailhub.in',
    stores: sampleStores,
    products: [
      {
        id: 'prod-1024',
        sku: 'SKU-1024',
        productCode: '8901030383742',
        name: 'Daawat Rice 5kg',
        description: null,
        brandId: 'brd-1',
        brandName: 'Daawat',
        categoryId: 'cat-1',
        categoryName: 'Rice',
        unitOfMeasure: 'PACK',
        costPrice: '310.00',
        sellingPrice: '389.00',
        mrp: '445.00',
        isActive: true,
        totalAvailableStock: '100.000',
      },
    ],
    balances,
    adsByStoreAndProduct: {
      'store-mum-01:prod-1024': 2.0,
      'store-pun-02:prod-1024': 4.0,
    },
    existingRecommendations: [],
  });
  assert.equal(manualReq.ok, true);
  if (manualReq.ok) {
    assert.equal(
      manualReq.createdRecommendation.recommendationType,
      'MANUAL_STORE_REQUEST',
    );
    assert.equal(
      manualReq.createdRecommendation.fromStoreCode,
      'DM-MUM-001',
    );
    assert.equal(manualReq.rankedCandidates.length, 1);
  }

  // Batch approve test
  const batchRes = batchApproveRecommendationsAction({
    recommendationIds: [openRec.id, 'non-existent-rec'],
    recommendations: [openRec],
    balances,
    transfers: [],
    movements: [],
    actions: [],
    comments: 'Morning batch approval',
    userId: 'usr-rm-west',
  });
  assert.equal(batchRes.processedCount, 2);
  assert.equal(batchRes.succeededCount, 1);
  assert.equal(batchRes.failedCount, 1);
});

test('DashboardService aggregates Executive 6 KPIs, 5 Recharts datasets, date validation, and DataScope-guarded Store Dashboard', () => {
  // Invalid date range (startDate > endDate) -> 400 INVALID_DATE_RANGE
  const invalidDateRes = computeExecutiveDashboardAggregation({
    startDate: '2026-10-28',
    endDate: '2026-10-20',
    transactions: [],
    balances: [],
    products: [],
    stores: sampleStores,
    recommendations: [],
    transfers: [],
  });
  assert.equal(invalidDateRes.ok, false);
  if (!invalidDateRes.ok) {
    assert.equal(invalidDateRes.errorCode, 'INVALID_DATE_RANGE');
  }

  const products: ProductCatalogRecord[] = [
    {
      id: 'prod-1024',
      sku: 'SKU-1024',
      productCode: '8901030383742',
      name: 'Fortune Sunflower Oil 1L',
      description: null,
      brandId: 'brd-1',
      brandName: 'Fortune',
      categoryId: 'cat-oil',
      categoryName: 'Edible Oils & Ghee',
      unitOfMeasure: 'LITRE',
      costPrice: '110.00',
      sellingPrice: '135.00',
      mrp: '150.00',
      isActive: true,
      totalAvailableStock: '150.000',
    },
  ];

  const balances: InventoryBalanceRecord[] = [
    {
      id: 'inv-1',
      storeId: 'store-mum-01',
      storeCode: 'DM-MUM-001',
      storeName: 'Powai Hypermarket',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Fortune Sunflower Oil 1L',
      availableQuantity: '150.000', // > maxStock 100 -> 50 excess * 110 cost = 5,500 trapped capital
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '100.000',
      reorderLevel: '20.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
    {
      id: 'inv-2',
      storeId: 'store-pun-02',
      storeCode: 'DM-PUN-002',
      storeName: 'Baner Fulfilment Center',
      productId: 'prod-1024',
      sku: 'SKU-1024',
      productName: 'Fortune Sunflower Oil 1L',
      availableQuantity: '3.000', // <= reorderLevel 20 -> LOW / stock-out alert
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '80.000',
      reorderLevel: '20.000',
      version: 1,
      lastUpdatedOn: '2026-10-26T08:00:00.000Z',
    },
  ];

  const execRes = computeExecutiveDashboardAggregation({
    startDate: '2026-10-01',
    endDate: '2026-10-26',
    transactions: [
      {
        id: 'tx-1',
        transactionNumber: 'POS-100',
        storeId: 'store-mum-01',
        storeCode: 'DM-MUM-001',
        storeName: 'Powai Hypermarket',
        transactionDate: '2026-10-26T10:00:00.000Z',
        customerId: null,
        totalQuantity: '10.000',
        totalAmount: '1350.00',
        lines: [
          {
            id: 'ln-1',
            productId: 'prod-1024',
            sku: 'SKU-1024',
            productName: 'Fortune Sunflower Oil 1L',
            quantity: '10.000',
            unitPrice: '135.00',
            discount: '0.00',
            netAmount: '1350.00',
          },
        ],
      },
    ],
    balances,
    products,
    stores: sampleStores,
    recommendations: [],
    transfers: [],
  });

  assert.equal(execRes.ok, true);
  if (execRes.ok) {
    assert.equal(execRes.data.kpis.totalSales, 1350);
    // (150 + 3) * 110 = 16,830
    assert.equal(execRes.data.kpis.totalInventoryValue, 16830);
    // (150 - 100) * 110 = 5,500
    assert.equal(execRes.data.kpis.trappedExcessCapital, 5500);
    assert.equal(execRes.data.kpis.stockOutSKUsCount, 1);
    assert.equal(execRes.data.charts.inventoryHealthDistribution.excess, 1);
    assert.equal(execRes.data.charts.inventoryHealthDistribution.low, 1);
    assert.equal(execRes.data.charts.categoryPerformance.length, 1);
  }

  // Store Dashboard DataScope guard: STORE_MANAGER assigned only to store-mum-01 cannot view store-pun-02
  const forbiddenStoreRes = computeStoreDashboardAggregation({
    storeId: 'store-pun-02',
    dataScope: { id: { in: ['store-mum-01'] } },
    stores: sampleStores,
    balances,
    transactions: [],
    transfers: [],
    recommendations: [],
    adsByStoreAndProduct: { 'store-pun-02:prod-1024': 2.1 },
  });
  assert.equal(forbiddenStoreRes.ok, false);
  if (!forbiddenStoreRes.ok) {
    assert.equal(forbiddenStoreRes.errorCode, 'FORBIDDEN_SCOPE');
    assert.equal(forbiddenStoreRes.statusCode, 403);
  }

  // Authorized Store Dashboard -> returns immediateRiskSkus (< 48h DOI)
  const validStoreRes = computeStoreDashboardAggregation({
    storeId: 'store-pun-02',
    dataScope: { id: { in: ['store-pun-02'] } },
    stores: sampleStores,
    balances,
    transactions: [],
    transfers: [],
    recommendations: [],
    adsByStoreAndProduct: { 'store-pun-02:prod-1024': 2.1 }, // DOI = 3 / 2.1 = 1.43d <= 2.0d
  });
  assert.equal(validStoreRes.ok, true);
  if (validStoreRes.ok) {
    assert.equal(validStoreRes.data.immediateRiskSkus.length, 1);
    assert.equal(validStoreRes.data.immediateRiskSkus[0].doiDays, 1.43);
  }
});

test('EventsGateway authenticates JWT handshake, assigns scoped Socket.io rooms, and SeederService executes Bhopal-Indore Golden Path (REC-1001)', () => {
  // Missing JWT token -> disconnects client
  const unauthWs = evaluateWebSocketHandshakeAndRooms({
    hasValidToken: false,
    userRole: 'STORE_MANAGER',
  });
  assert.equal(unauthWs.connected, false);

  // Valid Regional Manager handshake -> joins region_<id> room
  const rmWs = evaluateWebSocketHandshakeAndRooms({
    hasValidToken: true,
    userRole: 'REGIONAL_MANAGER',
    assignedRegionId: 'reg-central-mp',
  });
  assert.equal(rmWs.connected, true);
  if (rmWs.connected) {
    assert.deepEqual(rmWs.joinedRooms, ['region_reg-central-mp']);
    assert.equal(rmWs.pingIntervalMs, 25000);
    assert.equal(rmWs.pingTimeoutMs, 20000);
  }

  // Seeder Idempotency Guard: cleanReset = false when stores > 0 -> skips execution
  const skippedSeed = executeMasterSeedAndGoldenPathSimulation({
    cleanReset: false,
    existingStoreCount: 50,
  });
  assert.equal(skippedSeed.skipped, true);

  // Full Clean Reset + Golden Path Seeder (cleanReset = true) -> purges 21 tables in reverse-dependency order, seeds 50 stores / 500 SKUs, and generates REC-1001
  const fullSeed = executeMasterSeedAndGoldenPathSimulation({
    cleanReset: true,
    existingStoreCount: 50,
  });
  assert.equal(fullSeed.skipped, false);
  assert.equal(fullSeed.cleanResetExecuted, true);
  assert.equal(fullSeed.purgeTableOrder.length, 21);
  assert.equal(fullSeed.purgeTableOrder[0], 'ActionHistory');
  assert.equal(fullSeed.purgeTableOrder[20], 'User');
  assert.equal(REVERSE_DEPENDENCY_PURGE_ORDER.length, 21);
  assert.equal(fullSeed.seededCounts?.stores, 50);
  assert.equal(fullSeed.seededCounts?.products, 500);
  assert.ok(fullSeed.goldenPath !== null);
  assert.equal(fullSeed.goldenPath?.bhopalDest.doiDays, 1.43);
  assert.equal(fullSeed.goldenPath?.bhopalDest.riskTier, 'HIGH');
  assert.equal(fullSeed.goldenPath?.indoreDonor.doiDays, 110.0);
  assert.equal(fullSeed.goldenPath?.indoreDonor.status, 'EXCESS');
  assert.equal(
    fullSeed.goldenPath?.generatedRec.recommendationNumber,
    'REC-1001',
  );
  assert.equal(fullSeed.goldenPath?.generatedRec.fromStoreCode, 'IND-001');
  assert.equal(fullSeed.goldenPath?.generatedRec.storeCode, 'BPL-001');
});

test('Chunk F1 Design System: getStatusBadgeVariant, classifyDoiGaugeBar 4-zone thresholds, and RH_Header Scoped Store Switcher', () => {
  // 1. StatusBadge CVA mapping
  assert.equal(getStatusBadgeVariant('CRITICAL').variant, 'critical');
  assert.equal(
    getStatusBadgeVariant('CRITICAL').tailwindClasses,
    'bg-red-50 text-red-700 border-red-200',
  );
  assert.equal(getStatusBadgeVariant('LOW').variant, 'low');
  assert.equal(getStatusBadgeVariant('HEALTHY').variant, 'healthy');
  assert.equal(getStatusBadgeVariant('EXCESS').variant, 'excess');
  assert.equal(
    getStatusBadgeVariant('APPROVED_IN_TRANSIT').variant,
    'inTransit',
  );
  assert.equal(getStatusBadgeVariant('REJECTED').variant, 'rejected');

  // 2. RH_DOIGauge 4-zone horizontal bar classification
  assert.equal(classifyDoiGaugeBar(1.43).zone, 'CRITICAL');
  assert.equal(classifyDoiGaugeBar(1.43).barColorClass, 'bg-red-500');
  assert.equal(classifyDoiGaugeBar(5.0).zone, 'LOW');
  assert.equal(classifyDoiGaugeBar(5.0).barColorClass, 'bg-amber-500');
  assert.equal(classifyDoiGaugeBar(14.0).zone, 'HEALTHY');
  assert.equal(classifyDoiGaugeBar(14.0).barColorClass, 'bg-emerald-500');
  assert.equal(classifyDoiGaugeBar(110.0).zone, 'EXCESS');
  assert.equal(classifyDoiGaugeBar(110.0).barColorClass, 'bg-purple-500');

  // 3. RH_Header Scoped Store Switcher
  const smScope = resolveHeaderStoreSwitcherScope({
    role: 'STORE_MANAGER',
    assignedRegionIds: ['reg-west'],
    assignedStoreIds: ['store-mum-01'],
    stores: sampleStores,
  });
  assert.equal(smScope.isLocked, true);
  assert.equal(smScope.allowAllStores, false);
  assert.equal(smScope.visibleStores.length, 1);
  assert.equal(smScope.defaultSelectedStoreId, 'store-mum-01');

  const rmScope = resolveHeaderStoreSwitcherScope({
    role: 'REGIONAL_MANAGER',
    assignedRegionIds: ['reg-west'],
    assignedStoreIds: [],
    stores: sampleStores,
  });
  assert.equal(rmScope.isLocked, false);
  assert.equal(rmScope.allowAllStores, true);
  assert.equal(rmScope.visibleStores.length, 2);

  const execScope = resolveHeaderStoreSwitcherScope({
    role: 'EXECUTIVE',
    assignedRegionIds: [],
    assignedStoreIds: [],
    stores: sampleStores,
  });
  assert.equal(execScope.isLocked, false);
  assert.equal(execScope.allowAllStores, true);
  assert.equal(execScope.visibleStores.length, 3);
});

test('Chunk F2 Operations Views: CategoryTreeCombobox drill-down/search, 1,000-row CSV batch chunking, D-Mart value pricing validation, and regional store grouping', () => {
  // 1. CategoryTreeCombobox recursive flattening & parentTrailLabel ("Parent > Grandparent")
  const flatCategories: FlatCategoryRecord[] = [
    {
      id: 'cat-groceries',
      categoryCode: 'CAT-GROC',
      name: 'Groceries',
      parentCategoryId: null,
      level: 1,
      isActive: true,
    },
    {
      id: 'cat-oils',
      categoryCode: 'CAT-OILS',
      name: 'Cooking Oils',
      parentCategoryId: 'cat-groceries',
      level: 2,
      isActive: true,
    },
    {
      id: 'cat-sunflower',
      categoryCode: 'CAT-SUNFLOWER',
      name: 'Sunflower Oil',
      parentCategoryId: 'cat-oils',
      level: 3,
      isActive: true,
    },
  ];
  const tree = buildRecursiveCategoryTree(flatCategories);
  const comboboxItems = flattenCategoryTreeForCombobox(tree);
  assert.equal(comboboxItems.length, 3);
  const leaf = comboboxItems.find((i) => i.id === 'cat-sunflower')!;
  assert.equal(leaf.isLeaf, true);
  assert.equal(leaf.parentTrailLabel, 'Cooking Oils > Groceries');
  assert.deepEqual(leaf.breadcrumbTrail, [
    'Groceries',
    'Cooking Oils',
    'Sunflower Oil',
  ]);

  // 2. Client-side CSV batch chunking (<= 1,000 rows per batch)
  const syntheticRows = Array.from({ length: 2450 }, (_, idx) => ({
    sku: `SKU-${idx + 1}`,
  }));
  const chunked = chunkCsvProductsBatch(syntheticRows, 1000);
  assert.equal(chunked.totalRows, 2450);
  assert.equal(chunked.totalBatches, 3);
  assert.equal(chunked.batches[0].length, 1000);
  assert.equal(chunked.batches[1].length, 1000);
  assert.equal(chunked.batches[2].length, 450);

  // 3. D-Mart Value Pricing validation (sellingPrice <= mrp)
  const validPricing = validateProductValuePricing({
    costPrice: 112,
    sellingPrice: 135,
    mrp: 160,
  });
  assert.equal(validPricing.valid, true);
  assert.equal(validPricing.customerSavings, 25);
  assert.equal(validPricing.discountPercent, 15.6);

  const invalidPricing = validateProductValuePricing({
    costPrice: 112,
    sellingPrice: 175,
    mrp: 160,
  });
  assert.equal(invalidPricing.valid, false);
  assert.equal(
    invalidPricing.errorMessage,
    'Store selling price cannot exceed MRP',
  );

  // 4. Regional store grouping
  const grouped = groupStoreDirectoryByRegion(sampleStores);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].stores.length, 2);
  assert.equal(grouped[1].stores.length, 1);
});

test('Chunk F3 Inventory Health & Movement Ledger: 3-decimal quantity precision, inward receiving barcode scan & damaged write-off shortfall, and cycle count projected stock with optimistic locking', () => {
  // 1. 3-decimal quantity precision formatting
  assert.equal(formatInventoryQty3Decimals(3, 'PIECE'), '3.000 Units');
  assert.equal(formatInventoryQty3Decimals(10.5, 'KG'), '10.500 KG');
  assert.equal(formatInventoryQty3Decimals(0, 'LITRE'), '0.000 LITRE');

  // 2. Inward receiving barcode scan + shortfall / damaged write-off calculation
  const consignmentLines = [
    {
      productId: 'prod-oil-1l',
      sku: 'SKU-1024',
      productCode: '8901058851243',
      requestedQty: 20,
    },
    {
      productId: 'prod-atta-5kg',
      sku: 'SKU-2048',
      productCode: '8901725121105',
      requestedQty: 15,
    },
  ];

  // Start with 18.000 scanned on line 1 (2.000 short) and 15.000 on line 2, then scan barcode 8901058851243 (+1.000 -> 19.000, shortfall = 1.000)
  const scanOutcome = evaluateInwardScanAndShortfall(
    consignmentLines,
    {
      'prod-oil-1l': 18,
      'prod-atta-5kg': 15,
    },
    '8901058851243',
  );

  assert.equal(scanOutcome.matchedProductId, 'prod-oil-1l');
  assert.equal(scanOutcome.updatedQuantities['prod-oil-1l'], 19);
  assert.equal(scanOutcome.totalReceived, '34.000');
  assert.equal(scanOutcome.totalShortfall, '1.000');
  assert.equal(scanOutcome.lineShortfalls[0].shortfallQty, '1.000');
  assert.equal(scanOutcome.lineShortfalls[0].requiresDamageReason, true);
  assert.equal(scanOutcome.lineShortfalls[1].shortfallQty, '0.000');
  assert.equal(scanOutcome.lineShortfalls[1].requiresDamageReason, false);

  // 3. Cycle count manual adjustment projected stock + optimistic locking check
  const validAdjust = evaluateCycleCountProjectedStock({
    currentStock: 14.5,
    currentVersion: 4,
    expectedVersion: 4,
    mode: 'REDUCE',
    deltaMagnitude: 2.25,
  });
  assert.equal(validAdjust.versionConflict, false);
  assert.equal(validAdjust.signedDelta, '-2.250');
  assert.equal(validAdjust.projectedNewStock, '12.250');
  assert.equal(validAdjust.isValid, true);

  const conflictAdjust = evaluateCycleCountProjectedStock({
    currentStock: 14.5,
    currentVersion: 5,
    expectedVersion: 4,
    mode: 'ADD',
    deltaMagnitude: 5.0,
  });
  assert.equal(conflictAdjust.versionConflict, true);
  assert.equal(
    conflictAdjust.conflictToastMessage,
    'Stock was updated by another transaction. Reloading current balance.',
  );
});

test('Chunk F4 Action Center Views: SideBySideStoreCard before/after DOI math, CandidateStoreSelector 7-day donor DOI floor, Central Supply fallback badge, and BatchApproveBar summary', () => {
  // 1. SideBySideStoreCard calculations (Bhopal DB Mall <- Indore Vijay Nagar Hub)
  const comparison = computeSideBySideComparisonMetrics({
    destStore: {
      name: 'Bhopal DB Mall Store',
      code: 'STR-BPL-004',
      format: 'HYPERMARKET',
      currentStock: 3,
      ads: 2.1,
      currentDOI: 1.43,
    },
    sourceStore: {
      name: 'Indore Vijay Nagar Hub',
      code: 'STR-IDR-001',
      format: 'HYPERMARKET',
      currentStock: 48,
      ads: 1.35,
      currentDOI: 35.56,
      distanceKm: 190,
    },
    transferQty: 10,
    unitCost: 485,
  });

  assert.equal(comparison.destStockAfter, 13);
  assert.equal(Number(comparison.destDOIAfter.toFixed(2)), 6.19);
  assert.equal(comparison.srcStockAfter, 38);
  assert.equal(Number(comparison.srcDOIAfter.toFixed(2)), 28.15);
  assert.equal(comparison.estTransitHours, 3.8);
  assert.equal(comparison.transferValue, 4850);
  assert.equal(comparison.isCentralSupplyFallback, false);

  // 2. Central Supply fallback when sourceStore === null
  const centralFallback = computeSideBySideComparisonMetrics({
    destStore: {
      name: 'Ujjain Freeganj Express',
      code: 'STR-UJJ-007',
      format: 'EXPRESS',
      currentStock: 2,
      ads: 1.9,
      currentDOI: 1.05,
    },
    sourceStore: null,
    transferQty: 24,
    unitCost: 390,
  });
  assert.equal(centralFallback.isCentralSupplyFallback, true);
  assert.equal(
    centralFallback.centralSupplyBadgeText,
    '[🏭 Central Supply / Mother Hub]',
  );

  // 3. CandidateStoreSelector 7-day donor safety floor check
  // Indore has availableStock = 48, ads = 1.35 -> maxSafeTransfer = Math.floor(48 - 7.0 * 1.35) = 38 units
  const safeCheck = evaluateCandidateDonorSafetyFloor({
    storeName: 'Indore Vijay Nagar Hub',
    availableStock: 48,
    ads: 1.35,
    quantity: 10,
  });
  assert.equal(safeCheck.isValid, true);
  assert.equal(safeCheck.maxSafeTransfer, 38);
  assert.equal(safeCheck.violationBanner, null);

  // Sourcing 40 units drops Indore to (48 - 40) / 1.35 = 5.9 days DOI (<= 7.0d)
  const violatedCheck = evaluateCandidateDonorSafetyFloor({
    storeName: 'Indore Vijay Nagar Hub',
    availableStock: 48,
    ads: 1.35,
    quantity: 40,
  });
  assert.equal(violatedCheck.isValid, false);
  assert.equal(
    violatedCheck.violationBanner,
    'Safety Violation: Sourcing 40 units drops Indore Vijay Nagar Hub to 5.9 days DOI (Minimum required is 7.0 days). Maximum safe transfer is 38 units.',
  );

  // 4. BatchApproveBar summary (visible when >= 2 rows selected)
  const batchSummary = computeBatchApprovalSummary([
    { recommendedQty: 10, unitCost: 485 },
    { recommendedQty: 18, unitCost: 710 },
  ]);
  assert.equal(batchSummary.isVisible, true);
  assert.equal(batchSummary.selectedCount, 2);
  assert.equal(batchSummary.totalUnitsFormatted, '28.000');
  assert.equal(batchSummary.totalValuationInr, 17630);
  assert.equal(
    batchSummary.summaryText,
    '2 Transfers Selected • Total 28.000 Units • Est. Value ₹17,630',
  );
});

test('Chunk F5 Dashboards, 6 Role-Scoped Reports & Admin: RoleScopeFilterBar authority matrix, 16-column SKU performance metrics, and Audit JSON Diff inspector', () => {
  // 1. RoleScopeFilterBar authority rules
  const smScope = computeRoleScopedFilterCapabilities({
    role: 'STORE_MANAGER',
    assignedRegionId: 'reg-central-mp',
    assignedStoreId: 'store-bpl-001',
  });
  assert.equal(smScope.showRegionSelector, false);
  assert.equal(smScope.isStoreLocked, true);
  assert.equal(smScope.effectiveStoreId, 'store-bpl-001');

  const rmScope = computeRoleScopedFilterCapabilities({
    role: 'REGIONAL_MANAGER',
    assignedRegionId: 'reg-central-mp',
  });
  assert.equal(rmScope.showRegionSelector, true);
  assert.equal(rmScope.isRegionLocked, true);
  assert.equal(rmScope.isStoreLocked, false);
  assert.equal(rmScope.allowAllStoresInScope, true);

  const execScope = computeRoleScopedFilterCapabilities({
    role: 'EXECUTIVE',
  });
  assert.equal(execScope.showRegionSelector, true);
  assert.equal(execScope.isRegionLocked, false);
  assert.equal(execScope.isStoreLocked, false);

  // 2. 16-Column SKU Performance Report row calculations
  const skuPerf = computeSkuPerformanceRowMetrics({
    costPrice: 390,
    sellingPrice: 495,
    availableStock: 98,
    inTransitStock: 10,
    ads: 5.1,
  });
  assert.equal(skuPerf.unitMarginInr, 105);
  assert.equal(skuPerf.marginPercentFormatted, '21.2%');
  assert.equal(skuPerf.stockValuationFormatted, '42120.00');
  assert.equal(skuPerf.currentDOI, 19.22);
  assert.equal(skuPerf.velocityTier, 'FAST_MOVING');

  // 3. Audit Report Side-by-Side JSON Diff inspector
  const diffRows = computeAuditJsonDiffKeys(
    { status: 'OPEN', recommendedQuantity: 10, fromStoreCode: 'IND-001' },
    { status: 'APPROVED_IN_TRANSIT', recommendedQuantity: 10, fromStoreCode: 'IND-001' },
  );
  assert.equal(diffRows.length, 3);
  const statusDiff = diffRows.find((d) => d.key === 'status')!;
  assert.equal(statusDiff.isChanged, true);
  assert.equal(statusDiff.oldValueFormatted, '"OPEN"');
  assert.equal(statusDiff.newValueFormatted, '"APPROVED_IN_TRANSIT"');
  const qtyDiff = diffRows.find((d) => d.key === 'recommendedQuantity')!;
  assert.equal(qtyDiff.isChanged, false);
});





