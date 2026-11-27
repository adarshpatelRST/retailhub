import { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import {
  masterData,
  storesMap,
  productsMap,
  categoriesMap,
  brandsMap,
  regionsMap,
  getInventoryList,
  saveInventoryList,
  getRecommendationsList,
  saveRecommendationsList,
  getTransfersList,
  saveTransfersList,
  getSalesList,
  saveSalesList,
  getAuditLogsList,
  addAuditLogEntry,
  getProductsList,
  saveProductsList,
  getStoresList,
  saveStoresList,
  getCategoriesList,
  saveCategoriesList,
  getBrandsList,
  saveBrandsList,
  getUsersList,
  saveUsersList,
  getModelConfig,
  setModelConfig,
  resetDemoDatabase,
  getSchedulerState,
  saveSchedulerState,
  computeNextRunAt,
  DemoInventoryItem,
  DemoRecommendation,
  DemoTransfer,
  DemoSale,
  DemoStore,
  DemoProduct,
} from "./mockDatabase";

function createSuccessResponse<T>(config: InternalAxiosRequestConfig, data: T, meta?: any): AxiosResponse {
  const envelope: any = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  if (meta) {
    envelope.meta = meta;
  }
  return {
    data: envelope,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config,
  };
}

function createErrorResponse(
  config: InternalAxiosRequestConfig,
  statusCode: number,
  message: string,
  code = "API_ERROR",
): AxiosResponse {
  const envelope = {
    success: false,
    error: {
      code,
      message,
    },
    timestamp: new Date().toISOString(),
  };
  const error = new AxiosError(message, code, config, null, {
    data: envelope,
    status: statusCode,
    statusText: statusCode === 404 ? "Not Found" : (statusCode === 400 ? "Bad Request" : "Internal Error"),
    headers: { "content-type": "application/json" },
    config,
  });
  throw error;
}

function parseJsonBody(data: any): any {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

export async function mockAxiosAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method || "get").toUpperCase();
  let url = config.url || "";

  // Strip baseUrl / origins
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      url = parsed.pathname;
    } catch { }
  }
  if (url.startsWith("/api/v1")) {
    url = url.slice("/api/v1".length);
  }
  if (!url.startsWith("/")) {
    url = "/" + url;
  }

  // Strip query string from url if present
  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    url = url.slice(0, queryIndex);
  }

  const params: Record<string, any> = config.params || {};
  const body = parseJsonBody(config.data);

  // -------------------------------------------------------------
  // 1. AUTHENTICATION
  // -------------------------------------------------------------
  if (url === "/auth/login" && method === "POST") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    const demoUsers = [
      {
        id: "usr-admin-ops",
        email: "admin@retailhub.com",
        fullName: "Ananya Deshmukh (Platform Admin)",
        role: "ADMIN",
        mobileNumber: "+91-9820990011",
        assignedRegionIds: [],
        assignedStoreIds: [],
      },
      {
        id: "usr-exec-hq",
        email: "executive@retailhub.com",
        fullName: "Vikram Aditya (VP Retail Operations)",
        role: "EXECUTIVE",
        mobileNumber: "+91-9820778899",
        assignedRegionIds: [],
        assignedStoreIds: [],
      },
      {
        id: "usr-rm-west",
        email: "regional.central@retailhub.com",
        fullName: "Priya Nair (Regional Manager — Central MP)",
        role: "REGIONAL_MANAGER",
        mobileNumber: "+91-9820445566",
        assignedRegionIds: ["5f28af41-8788-4e65-b239-2cf5f307741b"],
        assignedStoreIds: [],
      },
      {
        id: "usr-sm-bhopal",
        email: "store.bhopal@retailhub.com",
        fullName: "Rajesh Sharma (Store Manager — Bhopal)",
        role: "STORE_MANAGER",
        mobileNumber: "+91-9820112233",
        assignedRegionIds: ["5f28af41-8788-4e65-b239-2cf5f307741b"],
        assignedStoreIds: ["store-bpl-001"],
      },
    ];

    const matched = demoUsers.find((u) => u.email.toLowerCase() === email);
    if (!matched) {
      return createErrorResponse(config, 401, "Invalid corporate credentials.", "UNAUTHORIZED");
    }

    return createSuccessResponse(config, {
      accessToken: `mock-jwt-${matched.role.toLowerCase()}-${Date.now()}`,
      refreshToken: `mock-refresh-${matched.role.toLowerCase()}`,
      user: matched,
    });
  }

  if (url === "/auth/me" && method === "GET") {
    return createSuccessResponse(config, {
      id: "usr-admin-ops",
      email: "admin@retailhub.com",
      fullName: "Ananya Deshmukh (Platform Admin)",
      role: "ADMIN",
      mobileNumber: "+91-9820990011",
      assignedRegionIds: [],
      assignedStoreIds: [],
    });
  }

  if (url === "/auth/change-password" && method === "POST") {
    return createSuccessResponse(config, { message: "Password updated successfully." });
  }

  if (url.startsWith("/auth/forgot-password/request-otp") && method === "POST") {
    return createSuccessResponse(config, { devOtp: "123456", message: "Verification code sent to corporate email." });
  }
  if (url.startsWith("/auth/forgot-password/verify-otp") && method === "POST") {
    return createSuccessResponse(config, { success: true, message: "OTP verified successfully." });
  }
  if (url.startsWith("/auth/forgot-password/reset-password") && method === "POST") {
    return createSuccessResponse(config, { success: true, message: "Password reset successfully." });
  }

  // -------------------------------------------------------------
  // 2. INVENTORY
  // -------------------------------------------------------------
  if (url === "/inventory" && method === "GET") {
    const rawList = getInventoryList();
    const storeId = params.storeId;
    const regionId = params.regionId;
    const categoryId = params.categoryId;
    const status = params.status;
    const risk = params.risk;
    const search = (params.search || "").trim().toLowerCase();
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 20));

    // Enrich inventory with master relations
    let enriched = rawList.map((inv) => {
      const store = storesMap.get(inv.storeId);
      const product = productsMap.get(inv.productId);
      const category = product ? categoriesMap.get(product.categoryId) : null;

      const avail = Number(inv.availableQuantity || 0);
      const reorder = Number(inv.reorderLevel || 15);
      const ads = Number((reorder > 0 ? reorder / 1.75 : 8.571).toFixed(3));
      const doi = ads > 0 ? Number((avail / ads).toFixed(1)) : 999.0;

      let computedStatus: "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS" = "HEALTHY";
      if (avail <= 0 || doi <= 0) computedStatus = "CRITICAL";
      else if (doi <= 7.0) computedStatus = "LOW";
      else if (doi > 30.0) computedStatus = "EXCESS";

      let computedRisk: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (doi <= 3.0) computedRisk = "HIGH";
      else if (doi <= 7.0) computedRisk = "MEDIUM";

      return {
        id: inv.id,
        storeId: inv.storeId,
        storeCode: store?.storeCode || "STR-000",
        storeName: store?.name || "Retail Store",
        productId: inv.productId,
        sku: product?.sku || "SKU-0000",
        productCode: product?.productCode || "8901000000000",
        productName: product?.name || "Product Item",
        unitOfMeasure: product?.unitOfMeasure || "PIECE",
        costPrice: Number(product?.costPrice || 100),
        sellingPrice: Number(product?.sellingPrice || 120),
        mrp: Number(product?.mrp || 140),
        availableQuantity: avail,
        reservedQuantity: Number(inv.reservedQuantity || 0),
        inTransitQuantity: Number(inv.inTransitQuantity || 0),
        minimumStock: Number(inv.minimumStock || 10),
        maximumStock: Number(inv.maximumStock || 200),
        reorderLevel: reorder,
        averageDailySales: ads,
        daysOfInventory: doi,
        status: computedStatus,
        riskTier: computedRisk,
        categoryName: category?.name || "General Goods",
        version: inv.version || 1,
        lastUpdatedOn: inv.lastUpdatedOn || new Date().toISOString(),
        rollingAds: ads,
        doi,
        healthStatus: computedStatus,
        barcode: product?.productCode || "",
        availableQty: avail,
      };
    });

    // Filters
    if (storeId && storeId !== "ALL") {
      enriched = enriched.filter((i) => i.storeId === storeId || i.storeCode === storeId);
    }
    if (regionId && regionId !== "ALL") {
      enriched = enriched.filter((i) => {
        const s = storesMap.get(i.storeId);
        return s?.regionId === regionId;
      });
    }
    if (categoryId && categoryId !== "ALL") {
      enriched = enriched.filter((i) => {
        const p = productsMap.get(i.productId);
        return p?.categoryId === categoryId;
      });
    }
    if (status && status !== "ALL") {
      enriched = enriched.filter((i) => i.status === status);
    }
    if (risk && risk !== "ALL") {
      enriched = enriched.filter((i) => i.riskTier === risk);
    }
    if (search) {
      enriched = enriched.filter((i) => {
        return (
          i.sku.toLowerCase().includes(search) ||
          i.productName.toLowerCase().includes(search) ||
          i.productCode.toLowerCase().includes(search) ||
          i.storeName.toLowerCase().includes(search) ||
          i.storeCode.toLowerCase().includes(search)
        );
      });
    }

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = enriched.slice(start, start + limit);

    return createSuccessResponse(config, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  if (url === "/inventory/adjust" && method === "POST") {
    const { storeId, productId, quantityDelta, remarks } = body;
    const rawList = getInventoryList();
    const item = rawList.find((i) => i.storeId === storeId && i.productId === productId);

    if (!item) {
      return createErrorResponse(config, 404, "Inventory record not found.", "NOT_FOUND");
    }

    const oldQty = Number(item.availableQuantity || 0);
    const newQty = Math.max(0, oldQty + Number(quantityDelta || 0));
    item.availableQuantity = newQty;
    item.version = (item.version || 1) + 1;
    item.lastUpdatedOn = new Date().toISOString();

    saveInventoryList(rawList);

    addAuditLogEntry({
      action: "STOCK_ADJUSTMENT",
      entityName: "Inventory",
      entityId: `${storeId}:${productId}`,
      oldValues: { availableQuantity: oldQty },
      newValues: { availableQuantity: newQty, delta: quantityDelta, remarks },
    });

    const store = storesMap.get(storeId);
    const product = productsMap.get(productId);

    return createSuccessResponse(config, {
      id: item.id,
      storeId,
      storeCode: store?.storeCode || "",
      storeName: store?.name || "",
      productId,
      sku: product?.sku || "",
      productName: product?.name || "",
      availableQuantity: newQty,
      version: item.version,
      lastUpdatedOn: item.lastUpdatedOn,
    });
  }

  // -------------------------------------------------------------
  // 3. ACTION CENTER / RECOMMENDATIONS
  // -------------------------------------------------------------
  const buildEnrichedRecommendation = (r: any, invList: any[]) => {
    const destStore = storesMap.get(r.toStoreId || r.storeId);
    const srcStore = r.fromStoreId ? storesMap.get(r.fromStoreId) : null;
    const product = productsMap.get(r.productId);
    const category = product ? categoriesMap.get(product.categoryId) : null;

    const destInv = invList.find((i) => i.storeId === destStore?.id && i.productId === r.productId);
    const destStockBefore = destInv ? Number(destInv.availableQuantity) : 0;
    const recQty = Number(r.recommendedQuantity || 20);
    const destStockAfter = destStockBefore + recQty;

    const destAds = Number((destInv && destInv.reorderLevel ? Number(destInv.reorderLevel) / 1.75 : 8.571).toFixed(3));
    const destDoiBefore = destAds > 0 ? Number((destStockBefore / destAds).toFixed(1)) : 0;
    const destDoiAfter = destAds > 0 ? Number((destStockAfter / destAds).toFixed(1)) : 14.0;

    let srcStockBefore = 0;
    let srcStockAfter = 0;
    let srcDoiBefore = 0;
    let srcDoiAfter = 0;
    let srcAds = 8.571;

    if (srcStore) {
      const srcInv = invList.find((i) => i.storeId === srcStore.id && i.productId === r.productId);
      srcStockBefore = srcInv ? Number(srcInv.availableQuantity) : 55;
      srcStockAfter = Math.max(0, srcStockBefore - recQty);
      srcAds = Number((srcInv && srcInv.reorderLevel ? Number(srcInv.reorderLevel) / 1.75 : 8.571).toFixed(3));
      srcDoiBefore = srcAds > 0 ? Number((srcStockBefore / srcAds).toFixed(1)) : 50.0;
      srcDoiAfter = srcAds > 0 ? Number((srcStockAfter / srcAds).toFixed(1)) : 40.0;
    }

    const costPrice = Number(product?.costPrice || 110);
    const mrp = Number(product?.mrp || 150);

    const isSameRegion = destStore && srcStore && destStore.regionId === srcStore.regionId;
    const distanceKm = srcStore ? (isSameRegion ? 25 : 280) : 150;
    const estTransitHours = Number((distanceKm / 45).toFixed(1));
    const toStoreFormat = destStore?.name.includes("Express")
      ? "EXPRESS"
      : destStore?.name.includes("Supermarket")
        ? "SUPERMARKET"
        : "HYPERMARKET";
    const fromStoreFormat = srcStore
      ? srcStore.name.includes("Express")
        ? "EXPRESS"
        : srcStore.name.includes("Supermarket")
          ? "SUPERMARKET"
          : "HYPERMARKET"
      : null;

    const createdOn = r.createdAt || new Date().toISOString();
    const updatedOn = r.updatedAt || createdOn;
    const aiExplanation =
      r.aiExplanation ||
      `Initiate replenishment of ${recQty} units for ${product?.name || "SKU"} (${product?.sku || "SKU-0000"}) at ${destStore?.name || "Destination Store"} (${destStore?.storeCode || "DST-001"}) to safeguard customer service levels.`;
    const potentialRevenueSaved = Math.round(recQty * mrp);

    const destStoreMetrics = {
      id: destStore?.id || r.toStoreId || r.storeId || "store-dest",
      name: destStore?.name || "Destination Hypermarket",
      code: destStore?.storeCode || "DST-001",
      format: toStoreFormat,
      city: destStore?.city || "City",
      state: destStore?.regionId || "State",
      currentStock: destStockBefore,
      ads: destAds,
      currentDOI: destDoiBefore,
    };

    const sourceStoreMetrics = srcStore
      ? {
          id: srcStore.id,
          name: srcStore.name,
          code: srcStore.storeCode,
          format: fromStoreFormat || "HYPERMARKET",
          city: srcStore.city,
          state: srcStore.regionId || "State",
          currentStock: srcStockBefore,
          ads: srcAds,
          currentDOI: srcDoiBefore,
          distanceKm,
        }
      : null;

    const auditHistory =
      Array.isArray(r.auditHistory) && r.auditHistory.length > 0
        ? r.auditHistory
        : [
            {
              id: `aud-${r.id}-init`,
              recommendationId: r.id,
              previousStatus: null,
              newStatus: r.status || "OPEN",
              changedBy: "SYSTEM-ENGINE",
              changedByName: "RepleniQ™ Autonomous Engine",
              changedByRole: "SYSTEM",
              changedOn: createdOn,
              comments: r.isManualRequest
                ? r.reason || "Store manager escalated manual replenishment request."
                : "Generated automatically from regional DOI and ADS velocity scan.",
            },
          ];

    return {
      id: r.id,
      recNumber: r.recommendationNumber || `REC-${r.id.slice(0, 8)}`,
      recommendationNumber: r.recommendationNumber || `REC-${r.id.slice(0, 8)}`,
      recommendationType: r.recommendationType || "REBALANCE_TRANSFER",
      priority: r.priority || "HIGH",
      status: r.status || "OPEN",
      isManualRequest: Boolean(r.isManualRequest),
      requestedByStoreManagerName: r.requestedByUserId ? "Store Manager" : null,
      storeRequestReason: r.reason || null,
      productId: r.productId,
      productName: product?.name || "Consumer Product",
      sku: product?.sku || "SKU-0000",
      barcode: product?.productCode || "8901000000000",
      categoryName: category?.name || "General Goods",
      unitCost: costPrice,
      mrp,
      toStoreId: destStoreMetrics.id,
      toStoreName: destStoreMetrics.name,
      toStoreCode: destStoreMetrics.code,
      toStoreFormat,
      toStoreCity: destStoreMetrics.city,
      toStoreState: destStoreMetrics.state,
      destStoreId: destStoreMetrics.id,
      destStoreName: destStoreMetrics.name,
      destStoreCode: destStoreMetrics.code,
      fromStoreId: srcStore?.id || null,
      fromStoreName: srcStore?.name || "Central Supply / Mother Hub",
      fromStoreCode: srcStore?.storeCode || "HUB-CENTRAL",
      fromStoreFormat: fromStoreFormat || "MOTHER_WAREHOUSE",
      fromStoreCity: srcStore?.city || "National DC",
      fromStoreState: srcStore?.regionId || "Central DC",
      sourceStoreId: srcStore?.id || null,
      sourceStoreName: srcStore?.name || "Central Supply / Mother Hub",
      sourceStoreCode: srcStore?.storeCode || "HUB-CENTRAL",
      recommendedQty: recQty,
      approvedQty: r.approvedQty ?? null,
      destStockBefore,
      destStockAfter,
      destDoiBefore,
      destDoiAfter,
      destAds,
      sourceStockBefore: srcStore ? srcStockBefore : null,
      sourceStockAfter: srcStore ? srcStockAfter : null,
      sourceDoiBefore: srcStore ? srcDoiBefore : null,
      sourceDoiAfter: srcStore ? srcDoiAfter : null,
      sourceAds: srcStore ? srcAds : null,
      distanceKm,
      estTransitHours,
      estimatedTransferCost: Number((distanceKm * 18).toFixed(0)),
      potentialRevenueSaved,
      aiExplanation,
      aiBriefing: aiExplanation,
      aiConfidence: 0.94,
      aiKeyFactors: [
        "Donor store retains > 7-day safety DOI",
        "Line-haul transit distance within regional corridor",
        "High-velocity SKU preventing imminent stockout",
      ],
      evidenceRows: r.evidence || [],
      destStore: destStoreMetrics,
      sourceStore: sourceStoreMetrics,
      auditHistory,
      createdAt: createdOn,
      createdOn,
      timestamp: createdOn,
      updatedAt: updatedOn,
      updatedOn,
    };
  };

  if ((url === "/recommendations" || url === "/action-center") && method === "GET") {
    const rawRecs = getRecommendationsList();
    const invList = getInventoryList();

    const priority = params.priority;
    const status = params.status;
    const regionId = params.regionId;
    const storeId = params.storeId || params.toStoreId;
    const requestType = params.requestType;
    const search = (params.search || "").trim().toLowerCase();
    const startDate = params.startDate;
    const endDate = params.endDate;
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 10));

    // Enrich recommendations
    let enriched = rawRecs.map((r) => buildEnrichedRecommendation(r, invList));

    // Filters
    if (requestType && requestType !== "ALL") {
      if (requestType === "AI_RECOMMENDED") {
        enriched = enriched.filter((r) => !r.isManualRequest);
      } else if (requestType === "STORE_REQUEST") {
        enriched = enriched.filter((r) => Boolean(r.isManualRequest));
      }
    }
    if (priority && priority !== "ALL") {
      enriched = enriched.filter((r) => r.priority === priority);
    }
    if (status && status !== "ALL") {
      enriched = enriched.filter((r) => r.status === status);
    }
    if (regionId && regionId !== "ALL") {
      enriched = enriched.filter((r) => {
        const s = storesMap.get(r.toStoreId);
        return s?.regionId === regionId;
      });
    }
    if (storeId && storeId !== "ALL") {
      enriched = enriched.filter((r) => r.toStoreId === storeId || r.toStoreCode === storeId);
    }
    if (search) {
      enriched = enriched.filter((r) => {
        return (
          r.sku.toLowerCase().includes(search) ||
          r.productName.toLowerCase().includes(search) ||
          r.recommendationNumber.toLowerCase().includes(search) ||
          r.toStoreName.toLowerCase().includes(search) ||
          r.toStoreCode.toLowerCase().includes(search) ||
          r.fromStoreName.toLowerCase().includes(search) ||
          r.fromStoreCode.toLowerCase().includes(search)
        );
      });
    }
    if (startDate) {
      const s = new Date(startDate).getTime();
      enriched = enriched.filter((r) => new Date(r.createdAt).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate).getTime() + 86400000;
      enriched = enriched.filter((r) => new Date(r.createdAt).getTime() <= e);
    }

    // Sort: Newest First
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = enriched.slice(start, start + limit);

    return createSuccessResponse(config, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  // Candidates for Recommendation
  if (
    (url.startsWith("/recommendations/candidates/") ||
      url.startsWith("/intelligence/candidates/") ||
      url.startsWith("/action-center/candidates/")) &&
    method === "GET"
  ) {
    const recId = url.replace(/^\/(recommendations|intelligence|action-center)\/candidates\//, "");
    const recList = getRecommendationsList();
    const rec = recList.find((r) => r.id === recId || r.recommendationNumber === recId);

    const destStoreId = rec?.toStoreId || rec?.storeId || "";
    const requestedQty = Number(rec?.recommendedQuantity || 20);
    const productId = rec?.productId || "";

    const invList = getInventoryList();
    const safePeers: any[] = [];
    const atRiskPeers: any[] = [];

    const destStore = storesMap.get(destStoreId);

    // Peer store candidates
    const peerInvs = invList
      .filter((i) => i.productId === productId && i.storeId !== destStoreId && Number(i.availableQuantity) > 0)
      .sort((a, b) => Number(b.availableQuantity) - Number(a.availableQuantity))
      .slice(0, 8);

    for (const inv of peerInvs) {
      const peerStore = storesMap.get(inv.storeId);
      if (!peerStore) continue;

      const avail = Number(inv.availableQuantity);
      const ads = 1.8;
      const postDoi = Number(((avail - requestedQty) / ads).toFixed(1));
      const isSameRegion = Boolean(destStore?.regionId && peerStore.regionId === destStore.regionId);
      const distanceKm = isSameRegion ? 35 : 280;
      const maxSafe = Math.max(0, Math.floor(avail - 7.0 * ads));
      const isSafe = postDoi >= 7.0;

      const cand = {
        storeId: peerStore.id,
        storeName: peerStore.name,
        storeCode: peerStore.storeCode,
        storeFormat: peerStore.name.includes("Express") ? "EXPRESS" : (peerStore.name.includes("Supermarket") ? "SUPERMARKET" : "HYPERMARKET"),
        city: peerStore.city,
        state: peerStore.regionId || "State",
        availableStock: avail,
        ads,
        currentDOI: Number((avail / ads).toFixed(1)),
        projectedDOI: postDoi,
        distanceKm,
        estTransitHours: Number((distanceKm / 45).toFixed(1)),
        excessUnitsAboveSafety: maxSafe,
        compositeScore: isSafe ? (isSameRegion ? 94.0 : 84.0) : 60.0,
        isDonorValid: isSafe,
        isSafeAtRequestedQty: isSafe,
      };

      if (isSafe) {
        safePeers.push(cand);
      } else {
        atRiskPeers.push(cand);
      }
    }

    const centralSupplyCandidate = {
      storeId: "CENTRAL_SUPPLY",
      storeName: "Central Supply / Mother Hub",
      storeCode: "HUB-CENTRAL",
      storeFormat: "MOTHER_WAREHOUSE",
      city: "National Distribution Center",
      state: "Central DC",
      availableStock: 99999,
      ads: 0,
      currentDOI: 999.0,
      projectedDOI: 999.0,
      distanceKm: 150,
      estTransitHours: 3.5,
      excessUnitsAboveSafety: 99999,
      compositeScore: 90.0,
      isDonorValid: true,
      isCentralSupply: true,
    };

    let rankedCandidates: any[] = [];
    if (safePeers.length > 0) {
      safePeers.sort((a, b) => b.compositeScore - a.compositeScore);
      rankedCandidates = [...safePeers, centralSupplyCandidate, ...atRiskPeers];
    } else {
      rankedCandidates = [centralSupplyCandidate, ...atRiskPeers];
    }

    return createSuccessResponse(
      config,
      rankedCandidates.map((cand, idx) => ({ ...cand, rank: idx + 1 })),
    );
  }

  // AI Explanation for Recommendation
  if (url.startsWith("/recommendations/") && url.endsWith("/explain") && method === "GET") {
    const recId = url.slice("/recommendations/".length, -"/explain".length);
    const recList = getRecommendationsList();
    const r = recList.find((item) => item.id === recId || item.recommendationNumber === recId);

    if (!r) {
      return createErrorResponse(config, 404, "Recommendation not found.", "NOT_FOUND");
    }

    const enriched = buildEnrichedRecommendation(r, getInventoryList());
    return createSuccessResponse(config, {
      recommendationId: enriched.id,
      narrative: enriched.aiExplanation,
      model: getModelConfig().activeModel || "gemini-2.5-flash",
      generatedAt: new Date().toISOString(),
      fallbackUsed: false,
      confidenceScore: 0.94,
      keyDrivers: enriched.aiKeyFactors,
    });
  }

  // Recommendation Detail
  if (
    url.startsWith("/recommendations/") &&
    !url.includes("/approve") &&
    !url.includes("/modify") &&
    !url.includes("/reject") &&
    !url.includes("/rules") &&
    !url.includes("/explain") &&
    method === "GET"
  ) {
    const recId = url.slice("/recommendations/".length);
    const recList = getRecommendationsList();
    const r = recList.find((item) => item.id === recId || item.recommendationNumber === recId);

    if (!r) {
      return createErrorResponse(config, 404, "Recommendation not found.", "NOT_FOUND");
    }

    return createSuccessResponse(config, buildEnrichedRecommendation(r, getInventoryList()));
  }

  // Approve Recommendation
  if (url.includes("/recommendations/") && url.endsWith("/approve") && method === "POST") {
    const recId = url.replace("/recommendations/", "").replace("/approve", "");
    const recList = getRecommendationsList();
    const rec = recList.find((r) => r.id === recId || r.recommendationNumber === recId);

    if (!rec) {
      return createErrorResponse(config, 404, "Recommendation not found.", "NOT_FOUND");
    }

    if (body?.fromStoreId !== undefined) {
      rec.fromStoreId = body.fromStoreId === "CENTRAL_SUPPLY" ? null : body.fromStoreId;
    }
    const transferQty = Number(body?.approvedQuantity ?? rec.recommendedQuantity ?? 20);
    rec.recommendedQuantity = transferQty;
    rec.approvedQty = transferQty;
    rec.status = "APPROVED";
    rec.updatedAt = new Date().toISOString();

    // Create Stock Transfer
    const transfers = getTransfersList();
    const newTransfer: DemoTransfer = {
      id: `trf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      transferNumber: `TRF-${Date.now().toString().slice(-6)}`,
      fromStoreId: rec.fromStoreId || "CENTRAL_SUPPLY",
      toStoreId: rec.toStoreId || rec.storeId,
      status: "IN_TRANSIT",
      carrierName: body?.carrierName || "RepleniQ Logistics Line-Haul",
      vehicleNumber: body?.vehicleNumber || "MH-04-RH-8822",
      dispatchNoteNumber: `DN-${Date.now().toString().slice(-6)}`,
      estimatedArrival: new Date(Date.now() + 12 * 3600000).toISOString(),
      dispatchedAt: new Date().toISOString(),
      receivedAt: null,
      requestedBy: "Auto-Rebalance Engine",
      approvedBy: "Regional Operations Manager",
      receivedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: [
        {
          id: `line-${Date.now()}`,
          transferId: `trf-${Date.now()}`,
          productId: rec.productId,
          requestedQuantity: transferQty,
          shippedQuantity: transferQty,
          receivedQuantity: null,
          discrepancyQuantity: null,
          discrepancyReason: null,
        },
      ],
    };
    transfers.unshift(newTransfer);
    saveTransfersList(transfers);

    rec.stockTransferId = newTransfer.id;
    saveRecommendationsList(recList);

    // Update inTransitStock for destination store
    const invList = getInventoryList();
    const destInv = invList.find((i) => i.storeId === rec.toStoreId && i.productId === rec.productId);
    if (destInv) {
      destInv.inTransitQuantity = Number(destInv.inTransitQuantity || 0) + transferQty;
      destInv.lastUpdatedOn = new Date().toISOString();
      saveInventoryList(invList);
    }

    // Decrement source inventory if from a peer store
    if (rec.fromStoreId && rec.fromStoreId !== "CENTRAL_SUPPLY") {
      const srcInv = invList.find((i) => i.storeId === rec.fromStoreId && i.productId === rec.productId);
      if (srcInv) {
        srcInv.availableQuantity = Math.max(0, Number(srcInv.availableQuantity || 0) - transferQty);
        srcInv.lastUpdatedOn = new Date().toISOString();
        saveInventoryList(invList);
      }
    }

    addAuditLogEntry({
      action: "APPROVE_RECOMMENDATION",
      entityName: "Recommendation",
      entityId: rec.recommendationNumber,
      newValues: { status: "APPROVED", transferId: newTransfer.id, quantity: transferQty },
    });

    return createSuccessResponse(config, {
      ...buildEnrichedRecommendation(rec, getInventoryList()),
      stockTransferId: newTransfer.id,
      stockTransfer: newTransfer,
    });
  }

  // Modify Recommendation
  if (url.includes("/recommendations/") && url.endsWith("/modify") && method === "POST") {
    const recId = url.replace("/recommendations/", "").replace("/modify", "");
    const recList = getRecommendationsList();
    const rec = recList.find((r) => r.id === recId || r.recommendationNumber === recId);

    if (!rec) {
      return createErrorResponse(config, 404, "Recommendation not found.", "NOT_FOUND");
    }

    const { modifiedQuantity, fromStoreId } = body;
    if (modifiedQuantity !== undefined) {
      rec.recommendedQuantity = Number(modifiedQuantity);
    }
    if (fromStoreId) {
      rec.fromStoreId = fromStoreId === "CENTRAL_SUPPLY" ? null : fromStoreId;
    }
    rec.status = "MODIFIED";
    rec.updatedAt = new Date().toISOString();

    saveRecommendationsList(recList);

    addAuditLogEntry({
      action: "MODIFY_RECOMMENDATION",
      entityName: "Recommendation",
      entityId: rec.recommendationNumber,
      newValues: {
        status: "MODIFIED",
        modifiedQuantity: rec.recommendedQuantity,
        fromStoreId: rec.fromStoreId,
      },
    });

    return createSuccessResponse(config, buildEnrichedRecommendation(rec, getInventoryList()));
  }

  // Reject Recommendation
  if (url.includes("/recommendations/") && url.endsWith("/reject") && !url.includes("batch-reject") && method === "POST") {
    const recId = url.replace("/recommendations/", "").replace("/reject", "");
    const recList = getRecommendationsList();
    const rec = recList.find((r) => r.id === recId || r.recommendationNumber === recId);

    if (!rec) {
      return createErrorResponse(config, 404, "Recommendation not found.", "NOT_FOUND");
    }

    rec.status = "REJECTED";
    rec.updatedAt = new Date().toISOString();
    saveRecommendationsList(recList);

    addAuditLogEntry({
      action: "REJECT_RECOMMENDATION",
      entityName: "Recommendation",
      entityId: rec.recommendationNumber,
      newValues: { status: "REJECTED", reason: body.reason || body.comments },
    });

    return createSuccessResponse(config, buildEnrichedRecommendation(rec, getInventoryList()));
  }

  // Batch Approve Recommendations
  if (url === "/recommendations/batch-approve" && method === "POST") {
    const { ids = [], comments = "Batch approved for dispatch via multi-select." } = body;
    const recList = getRecommendationsList();
    const transfers = getTransfersList();
    const invList = getInventoryList();

    let totalUnits = 0;
    let totalValuation = 0;
    const generatedTransferIds: string[] = [];
    let approvedCount = 0;

    for (const id of ids) {
      const rec = recList.find((r) => r.id === id || r.recommendationNumber === id);
      if (!rec) continue;
      if (rec.status === "APPROVED" || rec.status === "REJECTED" || rec.status === "EXECUTED") {
        continue;
      }

      rec.status = "APPROVED";
      rec.updatedAt = new Date().toISOString();
      const transferQty = Number(rec.recommendedQuantity || 20);
      rec.approvedQty = transferQty;
      approvedCount++;
      totalUnits += transferQty;

      const product = productsMap.get(rec.productId);
      const price = Number(product?.mrp || product?.sellingPrice || product?.costPrice || 250);
      totalValuation += transferQty * price;

      const newTransferId = `trf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      generatedTransferIds.push(newTransferId);

      const newTransfer: DemoTransfer = {
        id: newTransferId,
        transferNumber: `TRF-${Date.now().toString().slice(-6)}`,
        fromStoreId: rec.fromStoreId || "CENTRAL_SUPPLY",
        toStoreId: rec.toStoreId || rec.storeId,
        status: "IN_TRANSIT",
        carrierName: "RetailHub Logistics Line-Haul",
        vehicleNumber: "MH-04-RH-8822",
        dispatchNoteNumber: `DN-${Date.now().toString().slice(-6)}`,
        estimatedArrival: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        dispatchedAt: new Date().toISOString(),
        receivedAt: null,
        requestedBy: "usr-rm-west",
        approvedBy: "usr-rm-west",
        receivedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: [
          {
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: rec.productId,
            requestedQuantity: transferQty,
            shippedQuantity: transferQty,
            receivedQuantity: null,
            discrepancyQuantity: 0,
            discrepancyReason: null,
          },
        ],
      };
      transfers.unshift(newTransfer);

      const destInv = invList.find((i) => i.storeId === rec.toStoreId && i.productId === rec.productId);
      if (destInv) {
        destInv.inTransitQuantity = Number(destInv.inTransitQuantity || 0) + transferQty;
        destInv.lastUpdatedOn = new Date().toISOString();
      }

      if (rec.fromStoreId && rec.fromStoreId !== "CENTRAL_SUPPLY") {
        const srcInv = invList.find((i) => i.storeId === rec.fromStoreId && i.productId === rec.productId);
        if (srcInv) {
          srcInv.availableQuantity = Math.max(0, Number(srcInv.availableQuantity || 0) - transferQty);
          srcInv.lastUpdatedOn = new Date().toISOString();
        }
      }

      addAuditLogEntry({
        action: "BATCH_APPROVE_RECOMMENDATION",
        entityName: "Recommendation",
        entityId: rec.recommendationNumber,
        newValues: { status: "APPROVED", transferId: newTransfer.id, quantity: transferQty, comments },
      });
    }

    saveRecommendationsList(recList);
    saveTransfersList(transfers);
    saveInventoryList(invList);

    return createSuccessResponse(config, {
      approvedCount,
      skippedCount: ids.length - approvedCount,
      totalUnitsApproved: totalUnits,
      totalValuationInr: totalValuation,
      generatedTransferIds,
    });
  }

  // Batch Reject Recommendations
  if (url === "/recommendations/batch-reject" && method === "POST") {
    const { ids = [], reason = "Batch rejected by operations manager" } = body;
    const recList = getRecommendationsList();
    let rejectedCount = 0;

    for (const id of ids) {
      const rec = recList.find((r) => r.id === id || r.recommendationNumber === id);
      if (!rec) continue;
      if (rec.status === "APPROVED" || rec.status === "REJECTED" || rec.status === "EXECUTED") {
        continue;
      }

      rec.status = "REJECTED";
      rec.updatedAt = new Date().toISOString();
      rejectedCount++;

      addAuditLogEntry({
        action: "BATCH_REJECT_RECOMMENDATION",
        entityName: "Recommendation",
        entityId: rec.recommendationNumber,
        newValues: { status: "REJECTED", reason },
      });
    }

    saveRecommendationsList(recList);

    return createSuccessResponse(config, {
      rejectedCount,
      reason,
    });
  }

  if (url === "/recommendations/rules" && method === "GET") {
    return createSuccessResponse(config, [
      { id: "rule-1", name: "Minimum Donor Safety Floor", metric: "DONOR_DOI", threshold: 7.0, isEnforced: true },
      { id: "rule-2", name: "Maximum Line-Haul Radius", metric: "DISTANCE_KM", threshold: 300, isEnforced: true },
      { id: "rule-3", name: "Destination Stock Target", metric: "TARGET_DOI", threshold: 14.0, isEnforced: true },
    ]);
  }

  if (
    (url === "/intelligence/scan" || url === "/recommendations/scan" || url === "/scan") &&
    method === "POST"
  ) {
    return createSuccessResponse(config, {
      evaluatedPairs: 60,
      createdRecommendations: 2,
      highPriorityCount: 1,
      scanDurationMs: 420,
      timestamp: new Date().toISOString(),
    });
  }

  if (url === "/action-center/model-config" && method === "GET") {
    return createSuccessResponse(config, getModelConfig());
  }
  if (url === "/action-center/model-config" && method === "PUT") {
    const updated = setModelConfig(body.model || "gemini-2.5-flash");
    return createSuccessResponse(config, updated);
  }

  // -------------------------------------------------------------
  // 4. TRANSFERS
  // -------------------------------------------------------------
  if (url === "/transfers" && method === "GET") {
    const rawTransfers = getTransfersList();
    const shipmentType = params.shipmentType || "ALL";
    const status = params.status;
    const storeId = params.storeId;
    const regionId = params.regionId;
    const startDate = params.startDate;
    const endDate = params.endDate;
    const search = (params.search || "").trim().toLowerCase();
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 20));

    let enriched = rawTransfers.map((t) => {
      const src = storesMap.get(t.fromStoreId);
      const dest = storesMap.get(t.toStoreId);

      const lines = (t.lines || []).map((l) => {
        const p = productsMap.get(l.productId);
        return {
          id: l.id,
          productId: l.productId,
          sku: p?.sku || "SKU-0000",
          productCode: p?.productCode || "8901000000000",
          productName: p?.name || "Product Item",
          unitOfMeasure: p?.unitOfMeasure || "PIECE",
          requestedQty: Number(l.requestedQuantity || 0),
          shippedQty: Number(l.shippedQuantity || 0),
          receivedQty: l.receivedQuantity !== null ? Number(l.receivedQuantity) : null,
          shortfallQty: Number(l.discrepancyQuantity || 0),
          shortfallReason: l.discrepancyReason || undefined,
        };
      });

      return {
        id: t.id,
        transferNumber: t.transferNumber,
        fromStoreId: t.fromStoreId,
        toStoreId: t.toStoreId,
        sourceStoreId: src?.id || t.fromStoreId,
        sourceStoreCode: src?.storeCode || (t.fromStoreId === "CENTRAL_SUPPLY" ? "HUB-CENTRAL" : "STR-001"),
        sourceStoreName: src?.name || (t.fromStoreId === "CENTRAL_SUPPLY" ? "Central Supply / Mother Hub" : "Source Store"),
        destinationStoreId: dest?.id || t.toStoreId,
        destinationStoreCode: dest?.storeCode || "DST-001",
        destinationStoreName: dest?.name || "Destination Store",
        status: t.status,
        carrierName: t.carrierName || "RetailHub Fleet",
        vehicleNumber: t.vehicleNumber || "MH-12-RH-9001",
        dispatchNoteNumber: t.dispatchNoteNumber || `DN-${t.transferNumber}`,
        createdAt: t.createdAt || new Date().toISOString(),
        dispatchedAt: t.dispatchedAt || t.createdAt || new Date().toISOString(),
        estimatedArrival: t.estimatedArrival || new Date(Date.now() + 86400000).toISOString(),
        receivedAt: t.receivedAt || null,
        timestamp: t.createdAt || new Date().toISOString(),
        lines,
      };
    });

    if (storeId && storeId !== "ALL") {
      if (shipmentType === "INCOMING") {
        enriched = enriched.filter((t) => t.destinationStoreId === storeId);
      } else if (shipmentType === "OUTGOING") {
        enriched = enriched.filter((t) => t.sourceStoreId === storeId);
      } else {
        enriched = enriched.filter((t) => t.sourceStoreId === storeId || t.destinationStoreId === storeId);
      }
    }

    if (regionId && regionId !== "ALL") {
      enriched = enriched.filter((t) => {
        const src = storesMap.get(t.sourceStoreId);
        const dest = storesMap.get(t.destinationStoreId);
        return src?.regionId === regionId || dest?.regionId === regionId;
      });
    }

    if (status && status !== "ALL") {
      if (status === "INCOMING") {
        enriched = enriched.filter((t) =>
          ["APPROVED_IN_TRANSIT", "DISPATCHED", "PENDING_APPROVAL", "IN_TRANSIT"].includes(t.status),
        );
      } else if (status === "COMPLETED") {
        enriched = enriched.filter((t) =>
          ["COMPLETED", "RECEIVED"].includes(t.status),
        );
      } else {
        enriched = enriched.filter((t) => t.status === status);
      }
    }

    if (startDate) {
      const s = new Date(startDate).getTime();
      enriched = enriched.filter((t) => new Date(t.dispatchedAt || t.createdAt).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate).getTime() + 86400000;
      enriched = enriched.filter((t) => new Date(t.dispatchedAt || t.createdAt).getTime() <= e);
    }

    if (search) {
      enriched = enriched.filter((t) => {
        return (
          t.transferNumber.toLowerCase().includes(search) ||
          t.sourceStoreName.toLowerCase().includes(search) ||
          t.sourceStoreCode.toLowerCase().includes(search) ||
          t.destinationStoreName.toLowerCase().includes(search) ||
          t.destinationStoreCode.toLowerCase().includes(search)
        );
      });
    }

    enriched.sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime());

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = enriched.slice(start, start + limit);

    return createSuccessResponse(config, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  if (url.includes("/transfers/") && url.endsWith("/receive") && method === "POST") {
    const trfId = url.replace("/transfers/", "").replace("/receive", "");
    const rawTransfers = getTransfersList();
    const transfer = rawTransfers.find((t) => t.id === trfId || t.transferNumber === trfId);

    if (!transfer) {
      return createErrorResponse(config, 404, "Stock transfer not found.", "NOT_FOUND");
    }

    transfer.status = "RECEIVED";
    transfer.receivedAt = new Date().toISOString();
    saveTransfersList(rawTransfers);

    // Deposit stock at destination store
    const invList = getInventoryList();
    for (const line of transfer.lines || []) {
      const destInv = invList.find((i) => i.storeId === transfer.toStoreId && i.productId === line.productId);
      if (destInv) {
        destInv.availableQuantity = Number(destInv.availableQuantity || 0) + Number(line.shippedQuantity || 0);
        destInv.inTransitQuantity = Math.max(0, Number(destInv.inTransitQuantity || 0) - Number(line.shippedQuantity || 0));
        destInv.lastUpdatedOn = new Date().toISOString();
      }
    }
    saveInventoryList(invList);

    addAuditLogEntry({
      action: "RECEIVE_TRANSFER",
      entityName: "StockTransfer",
      entityId: transfer.transferNumber,
      newValues: { status: "RECEIVED" },
    });

    return createSuccessResponse(config, transfer);
  }

  // -------------------------------------------------------------
  // 5. SALES & POS SIMULATION
  // -------------------------------------------------------------
  if ((url === "/sales" || url === "/sales/transactions") && method === "GET") {
    const rawSales = getSalesList();
    const storeId = params.storeId;
    const regionId = params.regionId;
    const search = (params.search || "").trim().toLowerCase();
    const startDate = params.startDate;
    const endDate = params.endDate;
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 10));

    let rows: any[] = [];
    for (const sale of rawSales) {
      const store = storesMap.get(sale.storeId);
      for (const line of sale.lines || []) {
        const prod = productsMap.get(line.productId);
        const costPrice = Number(prod?.costPrice || 100);
        const sellingPrice = Number(line.unitPrice || prod?.sellingPrice || 120);
        const netAmount = Number(line.totalPrice || line.quantity * sellingPrice);
        const totalCost = line.quantity * costPrice;
        const marginPct = netAmount > 0 ? Number((((netAmount - totalCost) / netAmount) * 100).toFixed(1)) : 15.0;

        rows.push({
          id: `${sale.id}-${line.id}`,
          invoiceNumber: sale.transactionNumber,
          transactionDate: sale.transactionDate,
          timestamp: sale.transactionDate,
          storeId: sale.storeId,
          storeCode: store?.storeCode || "STR-001",
          storeName: store?.name || "Retail Store",
          productId: line.productId,
          sku: prod?.sku || "SKU-0000",
          productName: prod?.name || "Product Item",
          unitOfMeasure: prod?.unitOfMeasure || "PIECE",
          quantitySold: Number(line.quantity),
          unitPrice: sellingPrice,
          unitSellingPrice: sellingPrice,
          costPrice,
          netAmount,
          netSalesAmount: netAmount,
          grossMarginAmount: Math.max(0, netAmount - totalCost),
          margin: marginPct,
          marginPercent: marginPct,
        });
      }
    }

    if (storeId && storeId !== "ALL") {
      rows = rows.filter((r) => r.storeId === storeId || r.storeCode === storeId);
    }
    if (regionId && regionId !== "ALL") {
      rows = rows.filter((r) => {
        const s = storesMap.get(r.storeId);
        return s?.regionId === regionId;
      });
    }
    if (search) {
      rows = rows.filter((r) => {
        return (
          r.sku.toLowerCase().includes(search) ||
          r.productName.toLowerCase().includes(search) ||
          r.invoiceNumber.toLowerCase().includes(search) ||
          r.storeName.toLowerCase().includes(search) ||
          r.storeCode.toLowerCase().includes(search)
        );
      });
    }
    if (startDate) {
      const s = new Date(startDate).getTime();
      rows = rows.filter((r) => new Date(r.transactionDate).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate).getTime() + 86400000;
      rows = rows.filter((r) => new Date(r.transactionDate).getTime() <= e);
    }

    // Sort: Newest First
    rows.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);

    // Compute Summary KPIs
    const netRevenue = rows.reduce((acc, r) => acc + r.netAmount, 0);
    const unitsDispatched = rows.reduce((acc, r) => acc + r.quantitySold, 0);
    const totalInvoices = new Set(rows.map((r) => r.invoiceNumber)).size;
    const avgOrderValue = totalInvoices > 0 ? Number((netRevenue / totalInvoices).toFixed(0)) : 0;

    return createSuccessResponse(config, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      summary: {
        netRevenue,
        totalInvoices,
        unitsDispatched,
        avgOrderValue,
      },
    });
  }

  if ((url === "/sales/simulate" || url === "/sales/transactions/simulate") && method === "POST") {
    const { storeId, productId, quantity } = body;
    const qty = Number(quantity);

    if (!storeId || !productId || isNaN(qty) || qty <= 0) {
      return createErrorResponse(config, 400, "Invalid storeId, productId, or quantity.", "VALIDATION_ERROR");
    }

    const store = storesMap.get(storeId);
    const product = productsMap.get(productId);

    if (!store || !product) {
      return createErrorResponse(config, 404, "Store or product not found.", "NOT_FOUND");
    }

    const rawInv = getInventoryList();
    const invItem = rawInv.find((i) => i.storeId === storeId && i.productId === productId);

    const currentStock = invItem ? Number(invItem.availableQuantity) : 0;
    if (qty > currentStock) {
      return createErrorResponse(
        config,
        400,
        `Sale quantity (${qty.toFixed(3)}) exceeds available shelf stock (${currentStock.toFixed(3)}).`,
        "INSUFFICIENT_STOCK",
      );
    }

    const newStock = Math.max(0, currentStock - qty);
    if (invItem) {
      invItem.availableQuantity = newStock;
      invItem.lastUpdatedOn = new Date().toISOString();
      saveInventoryList(rawInv);
    }

    // Record POS Sale
    const rawSales = getSalesList();
    const unitPrice = Number(product.sellingPrice || 100);
    const totalAmount = qty * unitPrice;
    const saleId = `sale-${Date.now()}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    const newSale: DemoSale = {
      id: saleId,
      transactionNumber: invoiceNumber,
      storeId,
      transactionDate: new Date().toISOString(),
      customerId: null,
      totalQuantity: qty,
      totalAmount,
      lines: [
        {
          id: `sline-${Date.now()}`,
          transactionId: saleId,
          productId,
          quantity: qty,
          unitPrice,
          totalPrice: totalAmount,
        },
      ],
    };

    rawSales.unshift(newSale);
    saveSalesList(rawSales);

    // Auto-Rebalance Intelligence Trigger:
    // If stock drops below safe DOI threshold (< 7.0 days), create a new HIGH priority recommendation!
    const ads = 8.571;
    const newDoi = Number((newStock / ads).toFixed(1));
    let autoRecommendationCreated = false;

    if (newDoi < 7.0) {
      const recList = getRecommendationsList();
      const recQty = Math.max(20, Math.ceil(14.0 * ads - newStock));
      const newRec: DemoRecommendation = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recommendationNumber: `REC-${Date.now().toString().slice(-8)}`,
        recommendationType: "REBALANCE_TRANSFER",
        priority: "HIGH",
        status: "OPEN",
        storeId,
        productId,
        toStoreId: storeId,
        fromStoreId: null, // Central Supply default
        recommendedQuantity: recQty,
        reason: `Imminent stockout detected via POS checkout. Projected cover at ${newDoi.toFixed(1)} days.`,
        isManualRequest: false,
        requestedByUserId: null,
        aiExplanation: `Initiate Central Supply replenishment of ${recQty} units for ${product.name} (${product.sku}) at ${store.name} (${store.storeCode}) as regional peer inventory cannot absorb demand without breaching safety floors.`,
        stockTransferId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence: [
          { id: `ev-${Date.now()}-1`, recommendationId: "", metric: "DEST_CURRENT_STOCK", value: `${newStock.toFixed(3)} units` },
          { id: `ev-${Date.now()}-2`, recommendationId: "", metric: "DEST_CURRENT_DOI", value: `${newDoi.toFixed(1)} days` },
          { id: `ev-${Date.now()}-3`, recommendationId: "", metric: "DEST_ROLLING_ADS", value: `${ads.toFixed(3)} units/day` },
          { id: `ev-${Date.now()}-4`, recommendationId: "", metric: "POST_TRANSFER_DOI", value: "14.1 days" },
        ],
      };

      recList.unshift(newRec);
      saveRecommendationsList(recList);
      autoRecommendationCreated = true;
    }

    addAuditLogEntry({
      action: "POS_SALE_SIMULATION",
      entityName: "SalesTransaction",
      entityId: invoiceNumber,
      newValues: { storeId, productId, quantity: qty, remainingStock: newStock, autoRecommendationCreated },
    });

    return createSuccessResponse(config, {
      invoiceNumber,
      transactionId: saleId,
      storeId: store.id,
      storeName: store.name,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantitySold: qty,
      newAvailableQuantity: newStock,
      autoRecommendationCreated,
    });
  }

  // -------------------------------------------------------------
  // 6. MASTER DATA (STORES, PRODUCTS, CATEGORIES, BRANDS, USERS)
  // -------------------------------------------------------------
  if (url === "/stores/network-directory" || (url === "/stores" && method === "GET")) {
    const list = masterData.stores.map((s) => {
      const reg = regionsMap.get(s.regionId);
      return {
        ...s,
        regionName: reg?.name || "Region",
        format: s.name.includes("Express") ? "EXPRESS" : (s.name.includes("Supermarket") ? "SUPERMARKET" : "HYPERMARKET"),
      };
    });
    return createSuccessResponse(config, list);
  }

  if (url === "/stores" && method === "POST") {
    const sList = getStoresList();
    const newStore: DemoStore = {
      id: `store-${Date.now()}`,
      storeCode: (body.storeCode || `STR-${Date.now().toString().slice(-4)}`).toUpperCase(),
      name: body.name || "New Network Store",
      regionId: body.regionId || "reg-mp-central",
      storeTypeId: body.storeTypeId || "st-hyper",
      city: body.city || "Indore",
      address: body.address || "Main Commercial Street",
      latitude: Number(body.latitude || 22.7196),
      longitude: Number(body.longitude || 75.8577),
      openingDate: body.openingDate || new Date().toISOString().split("T")[0],
      isActive: body.isActive !== false,
    };
    sList.unshift(newStore);
    saveStoresList(sList);

    addAuditLogEntry({
      action: "CREATE_STORE",
      entityName: "Store",
      entityId: newStore.id,
      newValues: newStore,
    });

    return createSuccessResponse(config, newStore, 201);
  }

  if (url.startsWith("/stores/") && method === "PUT") {
    const sId = url.slice("/stores/".length);
    const sList = getStoresList();
    const idx = sList.findIndex((s) => s.id === sId || s.storeCode === sId);
    if (idx === -1) return createErrorResponse(config, 404, "Store not found", "NOT_FOUND");

    sList[idx] = {
      ...sList[idx],
      ...body,
    };
    saveStoresList(sList);

    addAuditLogEntry({
      action: "UPDATE_STORE",
      entityName: "Store",
      entityId: sId,
      newValues: sList[idx],
    });

    return createSuccessResponse(config, sList[idx]);
  }

  if (url.startsWith("/stores/") && method === "GET") {
    const storeId = url.slice("/stores/".length);
    const store = storesMap.get(storeId);
    if (!store) return createErrorResponse(config, 404, "Store not found", "NOT_FOUND");
    return createSuccessResponse(config, store);
  }

  if (url === "/regions" && method === "GET") {
    return createSuccessResponse(config, masterData.regions);
  }

  if (url === "/categories" && method === "GET") {
    const flat = getCategoriesList();
    const rootNodes: any[] = [];
    const nodeMap = new Map<string, any>();
    for (const c of flat) {
      nodeMap.set(c.id, {
        id: c.id,
        categoryCode: c.categoryCode || c.code || "CAT",
        name: c.name,
        parentCategoryId: c.parentCategoryId || null,
        level: c.level || (c.parentCategoryId ? 2 : 1),
        productCount: c.productCount || 0,
        subCategories: [],
      });
    }
    for (const c of flat) {
      const node = nodeMap.get(c.id);
      if (c.parentCategoryId && nodeMap.has(c.parentCategoryId)) {
        nodeMap.get(c.parentCategoryId).subCategories.push(node);
      } else {
        rootNodes.push(node);
      }
    }
    return createSuccessResponse(config, rootNodes);
  }

  if (url === "/categories/flat" && method === "GET") {
    const flat = getCategoriesList().map((c) => ({
      id: c.id,
      code: c.categoryCode || c.code || "CAT",
      name: c.name,
      parentCategoryId: c.parentCategoryId || null,
      parentName: c.parentName || null,
      parentCode: c.parentCode || null,
      productCount: c.productCount || 0,
      subCategoryCount: c.subCategoryCount || 0,
      isLeaf: c.isLeaf !== false,
      isActive: c.isActive !== false,
      createdAt: c.createdAt || "2026-01-01T00:00:00.000Z",
    }));
    return createSuccessResponse(config, flat);
  }

  if (url === "/categories" && method === "POST") {
    const cList = getCategoriesList();
    const newCat = {
      id: `cat-${Date.now()}`,
      categoryCode: (body.code || body.categoryCode || `CAT-${Date.now().toString().slice(-4)}`).toUpperCase(),
      code: (body.code || body.categoryCode || `CAT-${Date.now().toString().slice(-4)}`).toUpperCase(),
      name: body.name || "New Category",
      parentCategoryId: body.parentCategoryId === "ROOT" ? null : body.parentCategoryId || null,
      level: body.parentCategoryId && body.parentCategoryId !== "ROOT" ? 2 : 1,
      isActive: true,
      productCount: 0,
      subCategoryCount: 0,
      isLeaf: true,
      createdAt: new Date().toISOString(),
    };
    cList.unshift(newCat);
    saveCategoriesList(cList);

    addAuditLogEntry({
      action: "CREATE_CATEGORY",
      entityName: "Category",
      entityId: newCat.id,
      newValues: newCat,
    });

    return createSuccessResponse(config, newCat, 201);
  }

  if (url.startsWith("/categories/") && method === "PUT") {
    const cId = url.slice("/categories/".length);
    const cList = getCategoriesList();
    const idx = cList.findIndex((c) => c.id === cId || c.categoryCode === cId || c.code === cId);
    if (idx >= 0) {
      cList[idx] = { ...cList[idx], ...body, parentCategoryId: body.parentCategoryId === "ROOT" ? null : body.parentCategoryId };
      saveCategoriesList(cList);
      return createSuccessResponse(config, cList[idx]);
    }
    return createErrorResponse(config, 404, "Category not found", "NOT_FOUND");
  }

  if (url.startsWith("/categories/") && method === "DELETE") {
    const cId = url.slice("/categories/".length);
    const cList = getCategoriesList();
    const filtered = cList.filter((c) => c.id !== cId && c.categoryCode !== cId && c.code !== cId);
    saveCategoriesList(filtered);
    return createSuccessResponse(config, { id: cId, deleted: true });
  }

  if (url === "/brands" && method === "GET") {
    return createSuccessResponse(config, getBrandsList());
  }

  if (url === "/brands" && method === "POST") {
    const bList = getBrandsList();
    const newBrand = {
      id: `brand-${Date.now()}`,
      brandCode: (body.code || body.brandCode || `BR-${Date.now().toString().slice(-4)}`).toUpperCase(),
      code: (body.code || body.brandCode || `BR-${Date.now().toString().slice(-4)}`).toUpperCase(),
      name: body.name || "New Brand",
      manufacturer: body.manufacturer || "FMCG Consumer Products Ltd",
      isActive: true,
    };
    bList.unshift(newBrand);
    saveBrandsList(bList);

    addAuditLogEntry({
      action: "CREATE_BRAND",
      entityName: "Brand",
      entityId: newBrand.id,
      newValues: newBrand,
    });

    return createSuccessResponse(config, newBrand, 201);
  }

  if (url.startsWith("/brands/") && method === "PUT") {
    const bId = url.slice("/brands/".length);
    const bList = getBrandsList();
    const idx = bList.findIndex((b) => b.id === bId || b.brandCode === bId || b.code === bId);
    if (idx >= 0) {
      bList[idx] = { ...bList[idx], ...body };
      saveBrandsList(bList);
      return createSuccessResponse(config, bList[idx]);
    }
    return createErrorResponse(config, 404, "Brand not found", "NOT_FOUND");
  }

  if (url.startsWith("/brands/") && method === "DELETE") {
    const bId = url.slice("/brands/".length);
    const bList = getBrandsList();
    const filtered = bList.filter((b) => b.id !== bId && b.brandCode !== bId && b.code !== bId);
    saveBrandsList(filtered);
    return createSuccessResponse(config, { id: bId, deleted: true });
  }

  if (url === "/products/performance-report" && method === "GET") {
    const search = (params.search || "").trim().toLowerCase();
    const invList = getInventoryList();
    const salesList = getSalesList();

    const stockByProduct = new Map<string, number>();
    for (const inv of invList) {
      stockByProduct.set(inv.productId, (stockByProduct.get(inv.productId) || 0) + Number(inv.availableQuantity || 0));
    }

    const salesByProduct = new Map<string, { qty: number; revenue: number }>();
    for (const sale of salesList) {
      for (const line of sale.lines || []) {
        const prev = salesByProduct.get(line.productId) || { qty: 0, revenue: 0 };
        const price = Number(line.unitPrice || 100);
        const qty = Number(line.quantity || 0);
        salesByProduct.set(line.productId, {
          qty: prev.qty + qty,
          revenue: prev.revenue + (line.totalPrice ? Number(line.totalPrice) : qty * price),
        });
      }
    }

    let rows = masterData.products.map((p) => {
      const cat = categoriesMap.get(p.categoryId);
      const br = brandsMap.get(p.brandId);
      const avail = stockByProduct.get(p.id) || 45;
      const soldData = salesByProduct.get(p.id) || { qty: 22, revenue: 22 * Number(p.sellingPrice || 100) };
      const ads = Number((soldData.qty / 30).toFixed(2));
      const doi = ads > 0 ? Number((avail / ads).toFixed(1)) : 14.0;

      let velocityTier: "FAST_MOVING" | "MODERATE" | "SLOW_MOVING" | "DEAD_STOCK" = "MODERATE";
      if (ads >= 5.0) velocityTier = "FAST_MOVING";
      else if (ads >= 1.5) velocityTier = "MODERATE";
      else if (ads > 0) velocityTier = "SLOW_MOVING";
      else velocityTier = "DEAD_STOCK";

      let stockStatus: "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS" = "HEALTHY";
      if (avail <= 0 || doi <= 3.0) stockStatus = "CRITICAL";
      else if (doi <= 7.0) stockStatus = "LOW";
      else if (doi > 30.0) stockStatus = "EXCESS";

      return {
        id: p.id,
        sku: p.sku,
        productName: p.name,
        categoryName: cat?.name || "General Goods",
        brandName: br?.name || "Brand",
        costPrice: Number(p.costPrice || 80),
        sellingPrice: Number(p.sellingPrice || 100),
        availableStock: avail,
        unitsSold: soldData.qty,
        netRevenue: soldData.revenue,
        velocityTier,
        stockStatus,
        timestamp: new Date().toISOString(),
      };
    });

    if (search) {
      rows = rows.filter((p) => p.sku.toLowerCase().includes(search) || p.productName.toLowerCase().includes(search));
    }
    if (params.status && params.status !== "ALL") {
      rows = rows.filter((p) => p.velocityTier === params.status || p.stockStatus === params.status);
    }

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 100));
    const items = rows.slice((page - 1) * limit, page * limit);

    return createSuccessResponse(config, {
      items,
      meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) },
    });
  }

  if (url === "/products" && method === "GET") {
    const search = (params.search || "").trim().toLowerCase();
    const brandId = params.brandId;
    const categoryId = params.categoryId;
    const invList = getInventoryList();

    const stockByProduct = new Map<string, number>();
    for (const inv of invList) {
      stockByProduct.set(inv.productId, (stockByProduct.get(inv.productId) || 0) + Number(inv.availableQuantity || 0));
    }

    let list = masterData.products.map((p) => {
      const cat = categoriesMap.get(p.categoryId);
      const br = brandsMap.get(p.brandId);
      return {
        ...p,
        categoryName: cat?.name || "General Goods",
        brandName: br?.name || "Brand",
        totalStockUnits: stockByProduct.get(p.id) || 0,
      };
    });

    if (search) {
      list = list.filter((p) =>
        p.sku.toLowerCase().includes(search) ||
        p.name.toLowerCase().includes(search) ||
        (p.productCode && p.productCode.toLowerCase().includes(search))
      );
    }
    if (brandId && brandId !== "ALL") {
      list = list.filter((p) => p.brandId === brandId);
    }
    if (categoryId && categoryId !== "ALL") {
      list = list.filter((p) => p.categoryId === categoryId);
    }

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 20));
    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit);

    return createSuccessResponse(config, {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  if (url === "/products" && method === "POST") {
    const pList = getProductsList();
    const newProduct: DemoProduct = {
      id: `prod-${Date.now()}`,
      sku: (body.sku || `SKU-${Date.now().toString().slice(-4)}`).toUpperCase(),
      productCode: body.productCode || `890${Date.now().toString().slice(-9)}`,
      name: body.name || "New Catalog SKU",
      description: body.description || "",
      brandId: body.brandId || (pList[0]?.brandId || "brand-01"),
      categoryId: body.categoryId || (pList[0]?.categoryId || "cat-01"),
      unitOfMeasure: body.unitOfMeasure || "PIECE",
      costPrice: Number(body.costPrice || 50),
      sellingPrice: Number(body.sellingPrice || 75),
      mrp: Number(body.mrp || 80),
      isActive: body.isActive !== false,
    };
    pList.unshift(newProduct);
    saveProductsList(pList);

    addAuditLogEntry({
      action: "CREATE_PRODUCT",
      entityName: "Product",
      entityId: newProduct.id,
      newValues: newProduct,
    });

    return createSuccessResponse(config, newProduct, 201);
  }

  if (url === "/products/batch" && method === "POST") {
    const rows = body.products || [];
    const pList = getProductsList();
    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const existingIdx = pList.findIndex((p) => p.sku === row.sku);
      if (existingIdx >= 0) {
        pList[existingIdx] = { ...pList[existingIdx], ...row };
        updatedCount++;
      } else {
        pList.push({
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sku: row.sku,
          productCode: row.productCode || `890${Date.now().toString().slice(-9)}`,
          name: row.name,
          description: row.description || "",
          brandId: row.brandId || "brand-01",
          categoryId: row.categoryId || "cat-01",
          unitOfMeasure: row.unitOfMeasure || "PIECE",
          costPrice: Number(row.costPrice || 50),
          sellingPrice: Number(row.sellingPrice || 75),
          mrp: Number(row.mrp || 80),
          isActive: true,
        });
        insertedCount++;
      }
    }
    saveProductsList(pList);
    return createSuccessResponse(config, {
      totalProcessed: rows.length,
      insertedCount,
      updatedCount,
      failedCount: 0,
      errors: [],
    });
  }

  if (url.startsWith("/products/") && method === "PUT") {
    const pId = url.slice("/products/".length);
    const pList = getProductsList();
    const idx = pList.findIndex((p) => p.id === pId || p.sku === pId);
    if (idx === -1) return createErrorResponse(config, 404, "Product not found", "NOT_FOUND");

    pList[idx] = {
      ...pList[idx],
      ...body,
    };
    saveProductsList(pList);

    addAuditLogEntry({
      action: "UPDATE_PRODUCT",
      entityName: "Product",
      entityId: pId,
      newValues: pList[idx],
    });

    return createSuccessResponse(config, pList[idx]);
  }

  if (url.startsWith("/products/") && method === "DELETE") {
    const pId = url.slice("/products/".length);
    const pList = getProductsList();
    const filtered = pList.filter((p) => p.id !== pId && p.sku !== pId);
    saveProductsList(filtered);

    addAuditLogEntry({
      action: "DELETE_PRODUCT",
      entityName: "Product",
      entityId: pId,
    });

    return createSuccessResponse(config, { id: pId, deleted: true });
  }

  if (url.startsWith("/products/") && method === "GET") {
    const pId = url.slice("/products/".length);
    const p = productsMap.get(pId);
    if (!p) return createErrorResponse(config, 404, "Product not found", "NOT_FOUND");
    return createSuccessResponse(config, p);
  }

  if (url === "/users" && method === "GET") {
    const uList = getUsersList();
    return createSuccessResponse(config, uList);
  }

  if (url === "/users" && method === "POST") {
    const uList = getUsersList();
    const newUser = {
      id: `usr-${Date.now()}`,
      email: body.email,
      fullName: body.fullName || body.name || "New Staff User",
      role: body.role || "STORE_MANAGER",
      isActive: body.isActive !== false,
      assignedRegions: body.assignedRegions || [],
      assignedStores: body.assignedStores || [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    uList.unshift(newUser);
    saveUsersList(uList);

    addAuditLogEntry({
      action: "CREATE_USER",
      entityName: "User",
      entityId: newUser.id,
      newValues: newUser,
    });

    return createSuccessResponse(config, newUser, 201);
  }

  if (url.startsWith("/users/") && method === "PUT") {
    const uId = url.slice("/users/".length);
    const uList = getUsersList();
    const idx = uList.findIndex((u) => u.id === uId);
    if (idx >= 0) {
      uList[idx] = { ...uList[idx], ...body };
      saveUsersList(uList);

      addAuditLogEntry({
        action: "UPDATE_USER",
        entityName: "User",
        entityId: uId,
        newValues: uList[idx],
      });

      return createSuccessResponse(config, uList[idx]);
    }
    return createErrorResponse(config, 404, "User not found", "NOT_FOUND");
  }

  if (url.includes("/users/") && url.endsWith("/status") && method === "PATCH") {
    const uId = url.replace("/users/", "").replace("/status", "");
    const uList = getUsersList();
    const idx = uList.findIndex((u) => u.id === uId);
    if (idx >= 0) {
      uList[idx].isActive = body.isActive !== false;
      saveUsersList(uList);
      return createSuccessResponse(config, uList[idx]);
    }
    return createErrorResponse(config, 404, "User not found", "NOT_FOUND");
  }

  if (url.includes("/users/") && url.endsWith("/reset-password") && method === "POST") {
    return createSuccessResponse(config, { success: true, message: "User password reset successfully." });
  }

  if (url.startsWith("/users/") && method === "DELETE") {
    const uId = url.slice("/users/".length);
    const uList = getUsersList();
    const filtered = uList.filter((u) => u.id !== uId);
    saveUsersList(filtered);
    return createSuccessResponse(config, { id: uId, deleted: true });
  }

  // -------------------------------------------------------------
  // 7. DASHBOARDS & AUDIT
  // -------------------------------------------------------------
  if ((url === "/dashboards/executive" || url === "/dashboard/executive") && method === "GET") {
    const regionId = params.regionId;
    const storeId = params.storeId;
    const startDate = params.startDate;
    const endDate = params.endDate;

    let targetStoreIds = new Set<string>();
    if (storeId && storeId !== "ALL_STORES" && storeId !== "ALL") {
      targetStoreIds.add(storeId);
    } else if (regionId && regionId !== "ALL_REGIONS" && regionId !== "ALL") {
      masterData.stores.filter((s) => s.regionId === regionId).forEach((s) => targetStoreIds.add(s.id));
    }
    const hasStoreFilter = targetStoreIds.size > 0;

    let invList = getInventoryList();
    let recList = getRecommendationsList();
    let salesList = getSalesList();
    let transfersList = getTransfersList();

    if (hasStoreFilter) {
      invList = invList.filter((i) => targetStoreIds.has(i.storeId));
      recList = recList.filter((r) => targetStoreIds.has(r.toStoreId || r.storeId));
      salesList = salesList.filter((s) => targetStoreIds.has(s.storeId));
      transfersList = transfersList.filter((t) => (t.fromStoreId ? targetStoreIds.has(t.fromStoreId) : false) || targetStoreIds.has(t.toStoreId));
    }

    if (startDate) {
      const s = new Date(startDate).getTime();
      salesList = salesList.filter((x) => new Date(x.transactionDate).getTime() >= s);
      transfersList = transfersList.filter((x) => new Date(x.createdAt || (x as any).dispatchedAt || Date.now()).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate).getTime() + 86400000;
      salesList = salesList.filter((x) => new Date(x.transactionDate).getTime() <= e);
      transfersList = transfersList.filter((x) => new Date(x.createdAt || (x as any).dispatchedAt || Date.now()).getTime() <= e);
    }

    let criticalCount = 0;
    let lowCount = 0;
    let healthyCount = 0;
    let excessCount = 0;
    let totalStock = 0;

    for (const item of invList) {
      const avail = Number(item.availableQuantity || 0);
      totalStock += avail;
      const doi = avail / 8.571;
      if (avail <= 0 || doi <= 0) criticalCount++;
      else if (doi <= 7.0) lowCount++;
      else if (doi <= 30.0) healthyCount++;
      else excessCount++;
    }

    const openRecs = recList.filter((r) => r.status === "OPEN" || r.status === "GENERATED");
    const storeCountRatio = hasStoreFilter ? targetStoreIds.size / 50 : 1.0;
    const baseRev = Math.round(148_650_000 * storeCountRatio);
    const netRev = salesList.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0) + baseRev;
    const totalSkus = masterData.products.length || 500;
    const totalEvaluated = criticalCount + lowCount + healthyCount + excessCount || 1;
    const healthScorePct = Number(((healthyCount / totalEvaluated) * 100).toFixed(1));

    const inTransitTransfers = transfersList.filter(
      (t) => t.status === "IN_TRANSIT" || t.status === "DISPATCHED" || t.status === "APPROVED",
    );
    let inTransitUnitsTotal = 0;
    for (const t of inTransitTransfers) {
      for (const line of t.lines || []) {
        inTransitUnitsTotal += Number(line.shippedQuantity || line.requestedQuantity || line.requestedQty || 0);
      }
    }

    const salesTrend = [
      { date: "01 Nov", revenue: Math.round(4_620_000 * storeCountRatio), unitsSold: Math.round(18400 * storeCountRatio), targetRevenue: Math.round(4_500_000 * storeCountRatio) },
      { date: "05 Nov", revenue: Math.round(4_890_000 * storeCountRatio), unitsSold: Math.round(19250 * storeCountRatio), targetRevenue: Math.round(4_600_000 * storeCountRatio) },
      { date: "10 Nov", revenue: Math.round(5_140_000 * storeCountRatio), unitsSold: Math.round(20400 * storeCountRatio), targetRevenue: Math.round(4_750_000 * storeCountRatio) },
      { date: "15 Nov", revenue: Math.round(4_980_000 * storeCountRatio), unitsSold: Math.round(19800 * storeCountRatio), targetRevenue: Math.round(4_800_000 * storeCountRatio) },
      { date: "20 Nov", revenue: Math.round(5_420_000 * storeCountRatio), unitsSold: Math.round(21900 * storeCountRatio), targetRevenue: Math.round(5_000_000 * storeCountRatio) },
      { date: "23 Nov", revenue: Math.round(5_780_000 * storeCountRatio), unitsSold: Math.round(23100 * storeCountRatio), targetRevenue: Math.round(5_150_000 * storeCountRatio) },
    ];

    const healthDistribution = [
      {
        status: "HEALTHY" as const,
        skuStoreCount: healthyCount,
        percentage: Number(((healthyCount / totalEvaluated) * 100).toFixed(1)),
        valuation: Math.round(totalStock * 110 * (healthyCount / totalEvaluated)),
      },
      {
        status: "LOW" as const,
        skuStoreCount: lowCount,
        percentage: Number(((lowCount / totalEvaluated) * 100).toFixed(1)),
        valuation: Math.round(totalStock * 110 * (lowCount / totalEvaluated)),
      },
      {
        status: "CRITICAL" as const,
        skuStoreCount: criticalCount,
        percentage: Number(((criticalCount / totalEvaluated) * 100).toFixed(1)),
        valuation: Math.round(totalStock * 110 * (criticalCount / totalEvaluated)),
      },
      {
        status: "EXCESS" as const,
        skuStoreCount: excessCount,
        percentage: Number(((excessCount / totalEvaluated) * 100).toFixed(1)),
        valuation: Math.round(totalStock * 110 * (excessCount / totalEvaluated)),
      },
    ];

    const baseStores = hasStoreFilter
      ? masterData.stores.filter((s) => targetStoreIds.has(s.id))
      : masterData.stores;

    const topAtRiskStores = baseStores.slice(0, 5).map((s, idx) => {
      const storeInv = invList.filter((i) => i.storeId === s.id);
      const crit = storeInv.filter((i) => Number(i.availableQuantity || 0) <= 0).length || Math.max(1, 5 - idx);
      const low = storeInv.filter((i) => Number(i.availableQuantity || 0) > 0 && Number(i.availableQuantity || 0) <= 15).length || Math.max(2, 12 - idx * 2);
      const exc = storeInv.filter((i) => Number(i.availableQuantity || 0) > 50).length || Math.max(1, 4 - idx);
      return {
        storeId: s.id,
        storeCode: s.storeCode,
        storeName: s.name,
        city: s.city,
        criticalCount: crit,
        lowCount: low,
        excessCount: exc,
        avgDOI: Number((4.5 + idx * 0.9).toFixed(1)),
      };
    });

    const categoryShare = [
      { categoryName: "Beverages & Tea", revenue: 38_400_000, stockValue: 15_200_000, sharePct: 25.8 },
      { categoryName: "Staples, Oil & Ghee", revenue: 44_100_000, stockValue: 19_800_000, sharePct: 29.7 },
      { categoryName: "Packaged Groceries & Spices", revenue: 31_200_000, stockValue: 13_400_000, sharePct: 21.0 },
      { categoryName: "Soaps & Body Care", revenue: 21_500_000, stockValue: 9_600_000, sharePct: 14.5 },
      { categoryName: "Detergents & Surface Cleaners", revenue: 13_450_000, stockValue: 6_280_000, sharePct: 9.0 },
    ];

    const stockOutPrevention = [
      { weekLabel: "Wk 1", rebalancedUnits: 310, protectedRevenue: 980_000, avgResolutionHours: 4.2 },
      { weekLabel: "Wk 2", rebalancedUnits: 425, protectedRevenue: 1_240_000, avgResolutionHours: 3.8 },
      { weekLabel: "Wk 3", rebalancedUnits: 390, protectedRevenue: 1_190_000, avgResolutionHours: 3.5 },
      { weekLabel: "Wk 4", rebalancedUnits: 480, protectedRevenue: 1_440_000, avgResolutionHours: 3.1 },
    ];

    // Exception callouts from actual top recommendations
    const exceptionCallouts = openRecs.slice(0, 5).map((r, idx) => {
      const p = productsMap.get(r.productId);
      const s = storesMap.get(r.toStoreId || r.storeId);
      return {
        id: `exc-${r.id || idx}`,
        severity: r.priority === "HIGH" ? ("CRITICAL" as const) : ("HIGH" as const),
        title: r.reason || `Imminent stockout at ${s?.name || "Retail Store"}`,
        storeCode: s?.storeCode || "STR-001",
        storeName: s?.name || "Retail Store",
        sku: p?.sku || "SKU-0000",
        productName: p?.name || "Product Item",
        metricSummary: `Stock: 0.000 units · DOI: 0.0d · Rec Qty: ${r.recommendedQuantity || 20}u`,
        recommendationId: r.id,
        recNumber: r.recommendationNumber,
      };
    });

    const payload = {
      kpis: {
        totalRevenue30d: netRev,
        revenueGrowthPct: 14.2,
        inventoryValuation: Math.round(totalStock * 135),
        enterpriseHealthScorePct: healthScorePct,
        activeCriticalSkusCount: criticalCount,
        openRecommendationsCount: openRecs.length,
        inTransitTransfersCount: inTransitTransfers.length || 8,
        inTransitUnitsTotal: inTransitUnitsTotal || 420.0,
        preventedStockOuts30dValue: 4_850_000,
      },
      salesTrend,
      healthDistribution,
      topAtRiskStores,
      categoryShare,
      stockOutPrevention,
      exceptionCallouts,
    };

    return createSuccessResponse(config, payload);
  }

  if ((url.startsWith("/dashboards/store") || url.startsWith("/dashboard/store")) && method === "GET") {
    let reqStoreId = url.replace("/dashboards/store/", "").replace("/dashboards/store", "").replace("/dashboard/store/", "").replace("/dashboard/store", "");
    if (!reqStoreId || reqStoreId === "ALL_STORES") {
      reqStoreId = "store-bpl-001";
    }

    const matchedStore = storesMap.get(reqStoreId) || masterData.stores[0];
    const invList = getInventoryList();
    const recList = getRecommendationsList();
    const transfersList = getTransfersList();

    const storeInvs = invList.filter((i) => i.storeId === matchedStore?.id);
    let critCount = 0;
    let lowCount = 0;
    let healthyCount = 0;
    let excessCount = 0;

    for (const inv of storeInvs) {
      const avail = Number(inv.availableQuantity || 0);
      const doi = avail / 8.571;
      if (avail <= 0 || doi <= 0) critCount++;
      else if (doi <= 7.0) lowCount++;
      else if (doi <= 30.0) healthyCount++;
      else excessCount++;
    }

    const storeRecs = recList.filter((r) => (r.toStoreId === matchedStore?.id || r.storeId === matchedStore?.id) && (r.status === "OPEN" || r.status === "GENERATED"));
    const incomingShipments = transfersList.filter((t) => t.toStoreId === matchedStore?.id && (t.status === "IN_TRANSIT" || t.status === "DISPATCHED"));

    let incomingUnits = 0;
    const incomingDockShipments: any[] = [];
    for (const t of incomingShipments) {
      const src = storesMap.get(t.fromStoreId);
      for (const line of t.lines || []) {
        const prod = productsMap.get(line.productId);
        const q = Number(line.shippedQuantity || line.requestedQuantity || 0);
        incomingUnits += q;
        incomingDockShipments.push({
          transferId: t.id,
          transferNumber: t.transferNumber,
          sourceStoreCode: src?.storeCode || "HUB-CENTRAL",
          sourceStoreName: src?.name || "Central Supply",
          sku: prod?.sku || "SKU-0000",
          productName: prod?.name || "Product Item",
          quantity: q,
          status: t.status,
          carrierName: t.carrierName || "RetailHub Fleet",
          vehicleNumber: t.vehicleNumber || "MH-12-RH-9001",
          dispatchedAt: t.dispatchedAt || t.createdAt,
          etaHours: 3.5,
        });
      }
    }

    const immediateRiskWatchlist: any[] = [];
    const atRiskInvs = storeInvs
      .filter((i) => Number(i.availableQuantity) <= 20)
      .slice(0, 10);

    for (const inv of atRiskInvs) {
      const prod = productsMap.get(inv.productId);
      const cat = prod ? categoriesMap.get(prod.categoryId) : null;
      const rec = storeRecs.find((r) => r.productId === inv.productId);
      const avail = Number(inv.availableQuantity || 0);
      const ads = 8.571;
      const doi = Number((avail / ads).toFixed(1));

      immediateRiskWatchlist.push({
        id: inv.id,
        productId: inv.productId,
        sku: prod?.sku || "SKU-0000",
        productCode: prod?.productCode || "8901000000000",
        productName: prod?.name || "Product Item",
        categoryName: cat?.name || "General",
        availableQty: avail,
        inTransitQty: Number(inv.inTransitQuantity || 0),
        ads,
        currentDOI: doi,
        rop: Number(inv.reorderLevel || 15),
        stockStatus: doi <= 3 ? "CRITICAL" : "LOW",
        openRecNumber: rec?.recommendationNumber || null,
      });
    }

    const storePayload = {
      store: {
        id: matchedStore?.id || "store-bpl-001",
        storeCode: matchedStore?.storeCode || "BPL-001",
        name: matchedStore?.name || "Bhopal Sector-1 Hypermarket",
        city: matchedStore?.city || "Bhopal",
        regionName: "Central MP",
        storeFormat: matchedStore?.name.includes("Express") ? "EXPRESS" : (matchedStore?.name.includes("Supermarket") ? "SUPERMARKET" : "HYPERMARKET"),
      },
      kpis: {
        dailyRevenue: 412_500,
        monthlyRevenue: 12_480_000,
        totalActiveSkus: storeInvs.length || 90,
        criticalSkuCount: critCount,
        lowSkuCount: lowCount,
        incomingShipmentsCount: incomingShipments.length || 2,
        incomingUnitsTotal: incomingUnits || 65.0,
        storeHealthScorePct: storeInvs.length > 0 ? Number(((healthyCount / storeInvs.length) * 100).toFixed(1)) : 86.2,
      },
      salesTrend: [
        { date: "01 Nov", revenue: 390_000, unitsSold: 1420, targetRevenue: 385_000 },
        { date: "06 Nov", revenue: 405_000, unitsSold: 1490, targetRevenue: 390_000 },
        { date: "12 Nov", revenue: 428_000, unitsSold: 1580, targetRevenue: 400_000 },
        { date: "18 Nov", revenue: 410_000, unitsSold: 1510, targetRevenue: 405_000 },
        { date: "22 Nov", revenue: 445_000, unitsSold: 1640, targetRevenue: 415_000 },
        { date: "23 Nov", revenue: 462_000, unitsSold: 1710, targetRevenue: 420_000 },
      ],
      healthDistribution: [
        { status: "HEALTHY" as const, skuStoreCount: healthyCount || 75, percentage: 83.1, valuation: 1_840_000 },
        { status: "LOW" as const, skuStoreCount: lowCount || 10, percentage: 9.9, valuation: 210_000 },
        { status: "CRITICAL" as const, skuStoreCount: critCount || 3, percentage: 2.8, valuation: 48_000 },
        { status: "EXCESS" as const, skuStoreCount: excessCount || 2, percentage: 4.2, valuation: 135_000 },
      ],
      immediateRiskWatchlist,
      incomingDockShipments,
    };

    return createSuccessResponse(config, storePayload);
  }

  if (url === "/dashboards/store-performance" && method === "GET") {
    const invList = getInventoryList();
    const salesList = getSalesList();
    const transfersList = getTransfersList();

    let targetStores = masterData.stores;
    if (params.regionId && params.regionId !== "ALL") {
      targetStores = targetStores.filter((s) => s.regionId === params.regionId);
    }
    if (params.storeId && params.storeId !== "ALL") {
      targetStores = targetStores.filter((s) => s.id === params.storeId);
    }

    const items = targetStores.map((s) => {
      const storeInv = invList.filter((i) => i.storeId === s.id);
      const crit = storeInv.filter((i) => Number(i.availableQuantity || 0) <= 0).length;
      const valuation = storeInv.reduce((acc, i) => acc + Number(i.availableQuantity || 0) * 110, 0);
      const storeSales = salesList.filter((x) => x.storeId === s.id);
      const totalRev = storeSales.reduce((acc, x) => acc + Number(x.totalAmount || 0), 0) + 2_800_000;
      const totalUnits = storeSales.reduce((acc, x) => acc + Number(x.totalQuantity || 0), 0) + 12_400;
      const compTransfers = transfersList.filter((t) => (t.toStoreId === s.id || t.fromStoreId === s.id) && ((t.status as string) === "COMPLETED" || t.status === "RECEIVED")).length;
      const reg = regionsMap.get(s.regionId);

      return {
        id: s.id,
        storeCode: s.storeCode,
        storeName: s.name,
        city: s.city,
        regionName: reg?.name || "Operational Region",
        storeFormat: s.name.includes("Express") ? "EXPRESS" : (s.name.includes("Supermarket") ? "SUPERMARKET" : "HYPERMARKET"),
        totalRevenue: totalRev,
        totalUnitsSold: totalUnits,
        grossMarginPct: 16.4,
        inventoryValuation: valuation || 1_450_000,
        avgStoreDOI: 7.2,
        criticalSkusCount: crit,
        completedTransfersCount: compTransfers || 4,
        healthScorePct: 88.5,
        timestamp: new Date().toISOString(),
      };
    });

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 50));
    return createSuccessResponse(config, {
      items: items.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) },
    });
  }

  if ((url === "/audit" || url === "/audit-logs") && method === "GET") {
    let logs = getAuditLogsList();
    const action = params.action;
    const regionId = params.regionId;
    const storeId = params.storeId;
    const search = (params.search || "").trim().toLowerCase();
    const startDate = params.startDate;
    const endDate = params.endDate;
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 10));

    if (action && action !== "ALL") {
      logs = logs.filter((l) => (l.action || "").toUpperCase().includes(action.toUpperCase()));
    }
    if (storeId && storeId !== "ALL") {
      logs = logs.filter((l) => l.storeId === storeId || l.entityId === storeId || (l.newValues && l.newValues.storeId === storeId));
    }
    if (regionId && regionId !== "ALL") {
      const regionStores = new Set(masterData.stores.filter((s) => s.regionId === regionId).map((s) => s.id));
      logs = logs.filter((l) => regionStores.has(l.storeId) || (l.newValues && regionStores.has(l.newValues.storeId)));
    }
    if (search) {
      logs = logs.filter((l) =>
        (l.action || "").toLowerCase().includes(search) ||
        (l.entityName || "").toLowerCase().includes(search) ||
        (l.actorName || "").toLowerCase().includes(search) ||
        (l.actorEmail || "").toLowerCase().includes(search) ||
        (l.changeSummary || "").toLowerCase().includes(search)
      );
    }
    if (startDate) {
      const s = new Date(startDate).getTime();
      logs = logs.filter((l) => new Date(l.timestamp || l.createdAt).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate).getTime() + 86400000;
      logs = logs.filter((l) => new Date(l.timestamp || l.createdAt).getTime() <= e);
    }

    logs.sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());

    const total = logs.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = logs.slice(start, start + limit);

    return createSuccessResponse(config, {
      items,
      meta: { page, limit, total, totalPages },
    });
  }

  // -------------------------------------------------------------
  // 8. SCHEDULER & REBALANCE SWEEPS
  // -------------------------------------------------------------
  if (url === "/configurations/scheduler" && method === "GET") {
    const state = getSchedulerState();
    const nextRun = computeNextRunAt(state.config);
    const telemetry = {
      enabled: state.config.enabled,
      isActive: Boolean(state.config.enabled),
      isScanRunning: false,
      mode: state.config.mode,
      wavesEnabled: state.config.wavesEnabled,
      waveHours: state.config.waveHours,
      hourlyEnabled: state.config.hourlyEnabled,
      intervalValue: state.config.intervalValue,
      intervalUnit: state.config.intervalUnit,
      hourlyIntervalHours: state.config.hourlyIntervalHours,
      hourlyIntervalMinutes: state.config.hourlyIntervalMinutes,
      autoExpireEnabled: state.config.autoExpire,
      lastRunAt: state.telemetry.lastRunAt,
      lastRunType: state.telemetry.lastRunType,
      lastDurationMs: state.telemetry.lastDurationMs,
      lastEvaluatedPairs: state.telemetry.lastEvaluatedPairs,
      lastCreatedRecs: state.telemetry.lastCreatedRecs,
      lastAutoExpiredCount: state.telemetry.lastAutoExpiredCount,
      nextRunAt: nextRun,
      totalExecutions: state.telemetry.totalExecutions,
      recentExecutions: state.telemetry.recentExecutions,
    };
    return createSuccessResponse(config, {
      status: telemetry,
      config: state.config,
    });
  }

  if (url === "/configurations/scheduler" && method === "PUT") {
    const state = getSchedulerState();
    const updates = body;
    if (typeof updates.enabled === "boolean") state.config.enabled = updates.enabled;
    if (typeof updates.wavesEnabled === "boolean") state.config.wavesEnabled = updates.wavesEnabled;
    if (typeof updates.hourlyEnabled === "boolean") state.config.hourlyEnabled = updates.hourlyEnabled;
    if (typeof updates.autoExpire === "boolean") state.config.autoExpire = updates.autoExpire;
    if (updates.intervalUnit) state.config.intervalUnit = updates.intervalUnit;
    if (updates.intervalValue !== undefined) state.config.intervalValue = Number(updates.intervalValue);
    if (Array.isArray(updates.waveHours)) state.config.waveHours = updates.waveHours;
    if (updates.safetyFloorDays !== undefined) state.config.safetyFloorDays = Number(updates.safetyFloorDays);

    state.config.mode = state.config.wavesEnabled && state.config.hourlyEnabled ? "BOTH" : (state.config.hourlyEnabled ? "HOURLY" : "WAVES");
    saveSchedulerState(state);

    const nextRun = computeNextRunAt(state.config);
    const telemetry = {
      ...state.telemetry,
      enabled: state.config.enabled,
      isActive: Boolean(state.config.enabled),
      isScanRunning: false,
      mode: state.config.mode,
      wavesEnabled: state.config.wavesEnabled,
      waveHours: state.config.waveHours,
      hourlyEnabled: state.config.hourlyEnabled,
      intervalValue: state.config.intervalValue,
      intervalUnit: state.config.intervalUnit,
      hourlyIntervalHours: state.config.hourlyIntervalHours,
      hourlyIntervalMinutes: state.config.hourlyIntervalMinutes,
      autoExpireEnabled: state.config.autoExpire,
      nextRunAt: nextRun,
    };
    return createSuccessResponse(config, {
      status: telemetry,
      config: state.config,
    });
  }

  if (url === "/configurations/scheduler/waves" && method === "POST") {
    const state = getSchedulerState();
    const { waveTime } = body;
    if (waveTime && typeof waveTime === "string") {
      const set = new Set(state.config.waveHours || []);
      set.add(waveTime.trim());
      state.config.waveHours = Array.from(set).sort();
      saveSchedulerState(state);
    }
    const nextRun = computeNextRunAt(state.config);
    return createSuccessResponse(config, {
      status: { ...state.telemetry, nextRunAt: nextRun },
      config: state.config,
    });
  }

  if (url.startsWith("/configurations/scheduler/waves/") && method === "DELETE") {
    const time = decodeURIComponent(url.slice("/configurations/scheduler/waves/".length));
    const state = getSchedulerState();
    state.config.waveHours = (state.config.waveHours || []).filter((h: string) => h !== time);
    saveSchedulerState(state);
    const nextRun = computeNextRunAt(state.config);
    return createSuccessResponse(config, {
      status: { ...state.telemetry, nextRunAt: nextRun },
      config: state.config,
    });
  }

  if (url === "/configurations/scheduler/trigger" && method === "POST") {
    const state = getSchedulerState();
    state.telemetry.totalExecutions = (state.telemetry.totalExecutions || 24) + 1;
    state.telemetry.lastRunAt = new Date().toISOString();
    state.telemetry.lastRunType = "MANUAL";
    state.telemetry.lastDurationMs = 1450;
    state.telemetry.lastEvaluatedPairs = 4558;
    state.telemetry.lastCreatedRecs = 5;

    state.telemetry.recentExecutions.unshift({
      id: `sweep-${Date.now()}`,
      timestamp: state.telemetry.lastRunAt,
      type: "MANUAL",
      durationMs: 1450,
      evaluatedPairs: 4558,
      createdRecs: 5,
      autoExpiredCount: 1,
      summary: "MANUAL sweep completed in 1450ms (4558 pairs, 5 recommendations generated)",
    });

    saveSchedulerState(state);
    const nextRun = computeNextRunAt(state.config);
    return createSuccessResponse(config, {
      status: {
        ...state.telemetry,
        enabled: state.config.enabled,
        isActive: Boolean(state.config.enabled),
        isScanRunning: false,
        nextRunAt: nextRun,
      },
      config: state.config,
    });
  }

  if (url === "/configurations/scheduler/simulate-stockout" && method === "POST") {
    const invList = getInventoryList();
    const bplStore = masterData.stores.find((s) => s.storeCode === "BPL-001") || masterData.stores[0];
    const item = invList.find((i) => i.storeId === bplStore.id && (i.productId === "prod-tata-tea-1kg" || i.productId.includes("1001")));
    if (item) {
      item.availableQuantity = 0;
      saveInventoryList(invList);
    }
    return createSuccessResponse(config, { message: "Test stockout simulated at Bhopal (BPL-001). Stock set to 0." });
  }

  if (url === "/configurations/scheduler/reset-test-stock" && method === "POST") {
    return createSuccessResponse(config, { message: "Test stock restored to baseline." });
  }

  if (url === "/configurations/scheduler/bulk-deplete" && method === "POST") {
    return createSuccessResponse(config, { message: "Bulk depletion completed." });
  }

  if (url === "/configurations/scheduler/restore-inventory" && method === "POST") {
    resetDemoDatabase();
    return createSuccessResponse(config, { message: "Inventory restored to baseline." });
  }

  if ((url === "/configurations/rules" || url === "/intelligence/rules") && method === "GET") {
    return createSuccessResponse(config, [
      { id: "rule-1", name: "Minimum Donor Safety Floor", metric: "DONOR_DOI", threshold: 7.0, isEnforced: true },
      { id: "rule-2", name: "Maximum Line-Haul Radius", metric: "DISTANCE_KM", threshold: 300, isEnforced: true },
      { id: "rule-3", name: "Destination Stock Target", metric: "TARGET_DOI", threshold: 14.0, isEnforced: true },
    ]);
  }

  if ((url === "/configurations/rules" || url === "/intelligence/rules") && method === "POST") {
    return createSuccessResponse(config, { message: "Rules updated." });
  }

  // -------------------------------------------------------------
  // 9. SIMULATION ENDPOINTS
  // -------------------------------------------------------------
  if (url === "/simulation/seed-demo" && method === "POST") {
    resetDemoDatabase();
    return createSuccessResponse(config, { success: true, message: "Demo database reset to baseline." });
  }

  // Default Fallback
  console.warn(`[MockAPI] Unhandled endpoint: ${method} ${url}`, { params, body });
  return createSuccessResponse(config, { success: true, message: "OK" });
}
