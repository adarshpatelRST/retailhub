import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  actionCenterApi,
  type RecommendationDto,
  type RecommendationQueryParams,
} from "../api/action-center.api";
import { type PaginatedResponse } from "@/api/client";

export const ACTION_CENTER_QUERY_KEYS = {
  all: ["action-center", "recommendations"] as const,
  lists: () => [...ACTION_CENTER_QUERY_KEYS.all, "list"] as const,
  list: (params: RecommendationQueryParams) =>
    [...ACTION_CENTER_QUERY_KEYS.lists(), params] as const,
  details: () => [...ACTION_CENTER_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...ACTION_CENTER_QUERY_KEYS.details(), id] as const,
  candidates: (id: string) =>
    [...ACTION_CENTER_QUERY_KEYS.all, "candidates", id] as const,
  explanation: (id: string) =>
    [...ACTION_CENTER_QUERY_KEYS.all, "explanation", id] as const,
};

/**
 * Deterministic fallback dataset used when the local preview runs without a live PostgreSQL backend.
 */
export const FALLBACK_RECOMMENDATIONS: RecommendationDto[] = [
  {
    id: "rec-bhopal-indore-001",
    recommendationNumber: "REC-20260725-0001",
    recommendationType: "REBALANCE_TRANSFER",
    priority: "HIGH",
    status: "GENERATED",
    isManualRequest: false,
    requestedByStoreManagerName: null,
    storeRequestReason: null,
    productId: "prod-tata-tea-1kg",
    productName: "Tata Tea Gold 1kg",
    sku: "SKU-GRO-101",
    barcode: "8901052001019",
    categoryName: "Beverages & Tea",
    unitCost: 485,
    mrp: 620,
    toStoreId: "store-bhopal-004",
    toStoreName: "Bhopal DB Mall Store",
    toStoreCode: "STR-BPL-004",
    toStoreFormat: "HYPERMARKET",
    fromStoreId: "store-indore-001",
    fromStoreName: "Indore Vijay Nagar Hub",
    fromStoreCode: "STR-IDR-001",
    fromStoreFormat: "HYPERMARKET",
    recommendedQty: 10,
    approvedQty: null,
    destStockBefore: 3,
    destAds: 2.1,
    destDoiBefore: 1.43,
    destDoiAfter: 6.19,
    sourceStockBefore: 48,
    sourceAds: 1.35,
    sourceDoiBefore: 35.56,
    sourceDoiAfter: 28.15,
    distanceKm: 190,
    potentialRevenueSaved: 6200,
    aiExplanation:
      "Bhopal DB Mall Store (STR-BPL-004) has dropped to a critical 1.43 days of inventory (3.000 units at 2.10 ADS) for Tata Tea Gold 1kg. Indore Vijay Nagar Hub (STR-IDR-001), located 190 km away (~3.8 hrs road transit via NH-86), currently holds 48.000 units (35.56d DOI). Transferring 10.000 units restores Bhopal to 6.19d DOI while keeping Indore safely cushioned at 28.15d DOI, protecting ₹6,200 in gross margin velocity.",
    destStore: {
      id: "store-bhopal-004",
      name: "Bhopal DB Mall Store",
      code: "STR-BPL-004",
      format: "HYPERMARKET",
      city: "Bhopal",
      state: "Madhya Pradesh",
      currentStock: 3,
      ads: 2.1,
      currentDOI: 1.43,
    },
    sourceStore: {
      id: "store-indore-001",
      name: "Indore Vijay Nagar Hub",
      code: "STR-IDR-001",
      format: "HYPERMARKET",
      city: "Indore",
      state: "Madhya Pradesh",
      currentStock: 48,
      ads: 1.35,
      currentDOI: 35.56,
      distanceKm: 190,
    },
    auditHistory: [
      {
        id: "aud-001",
        recommendationId: "rec-bhopal-indore-001",
        previousStatus: null,
        newStatus: "GENERATED",
        changedBy: "SYS-CRON-0200",
        changedByName: "Nightly Rebalance Engine v2.4",
        changedByRole: "SYSTEM",
        changedOn: "2026-07-25T02:00:12.000Z",
        comments:
          "Automated detection: Destination DOI 1.43d <= 3.0d threshold; Donor Indore Rank #1 (190 km, composite score 91.4).",
      },
    ],
    createdOn: "2026-07-25T02:00:12.000Z",
    updatedOn: "2026-07-25T02:00:12.000Z",
  },
  {
    id: "rec-pune-mumbai-002",
    recommendationNumber: "REC-20260725-0002",
    recommendationType: "REBALANCE_TRANSFER",
    priority: "HIGH",
    status: "GENERATED",
    isManualRequest: false,
    requestedByStoreManagerName: null,
    storeRequestReason: null,
    productId: "prod-fortune-oil-5l",
    productName: "Fortune Sunlite Refined Oil 5L Jar",
    sku: "SKU-GRO-204",
    barcode: "8906007281143",
    categoryName: "Edible Oils & Ghee",
    unitCost: 710,
    mrp: 865,
    toStoreId: "store-pune-002",
    toStoreName: "Pune Kothrud Hypermarket",
    toStoreCode: "STR-PUN-002",
    toStoreFormat: "HYPERMARKET",
    fromStoreId: "store-mumbai-001",
    fromStoreName: "Mumbai Malad West Flagship",
    fromStoreCode: "STR-MUM-001",
    fromStoreFormat: "HYPERMARKET",
    recommendedQty: 18,
    approvedQty: null,
    destStockBefore: 5,
    destAds: 2.8,
    destDoiBefore: 1.79,
    destDoiAfter: 8.21,
    sourceStockBefore: 96,
    sourceAds: 2.4,
    sourceDoiBefore: 40.0,
    sourceDoiAfter: 32.5,
    distanceKm: 148,
    potentialRevenueSaved: 15570,
    aiExplanation:
      "Pune Kothrud Hypermarket is projected to stock out of Fortune Sunlite 5L Jars within 43 hours (1.79d DOI). Mumbai Malad West Flagship holds 96.000 units (40.0d DOI) at 148 km via Mumbai-Pune Expressway. Rebalancing 18.000 units elevates Pune to 8.21d DOI and trims Mumbai's overstock to 32.5d DOI.",
    destStore: {
      id: "store-pune-002",
      name: "Pune Kothrud Hypermarket",
      code: "STR-PUN-002",
      format: "HYPERMARKET",
      city: "Pune",
      state: "Maharashtra",
      currentStock: 5,
      ads: 2.8,
      currentDOI: 1.79,
    },
    sourceStore: {
      id: "store-mumbai-001",
      name: "Mumbai Malad West Flagship",
      code: "STR-MUM-001",
      format: "HYPERMARKET",
      city: "Mumbai",
      state: "Maharashtra",
      currentStock: 96,
      ads: 2.4,
      currentDOI: 40.0,
      distanceKm: 148,
    },
    auditHistory: [
      {
        id: "aud-002",
        recommendationId: "rec-pune-mumbai-002",
        previousStatus: null,
        newStatus: "GENERATED",
        changedBy: "SYS-CRON-0200",
        changedByName: "Nightly Rebalance Engine v2.4",
        changedByRole: "SYSTEM",
        changedOn: "2026-07-25T02:00:18.000Z",
        comments: "High-priority stockout prevention rule triggered for Edible Oils.",
      },
    ],
    createdOn: "2026-07-25T02:00:18.000Z",
    updatedOn: "2026-07-25T02:00:18.000Z",
  },
  {
    id: "rec-ujjain-central-003",
    recommendationNumber: "REC-20260725-0003",
    recommendationType: "CENTRAL_REPLENISHMENT",
    priority: "HIGH",
    status: "GENERATED",
    isManualRequest: false,
    requestedByStoreManagerName: null,
    storeRequestReason: null,
    productId: "prod-surf-excel-2kg",
    productName: "Surf Excel Matic Top Load 2kg",
    sku: "SKU-HPC-309",
    barcode: "8901030844126",
    categoryName: "Home & Fabric Care",
    unitCost: 390,
    mrp: 495,
    toStoreId: "store-ujjain-007",
    toStoreName: "Ujjain Freeganj Express",
    toStoreCode: "STR-UJJ-007",
    toStoreFormat: "EXPRESS",
    fromStoreId: null,
    fromStoreName: null,
    fromStoreCode: null,
    fromStoreFormat: null,
    recommendedQty: 24,
    approvedQty: null,
    destStockBefore: 2,
    destAds: 1.9,
    destDoiBefore: 1.05,
    destDoiAfter: 13.68,
    sourceStockBefore: null,
    sourceAds: null,
    sourceDoiBefore: null,
    sourceDoiAfter: null,
    distanceKm: null,
    potentialRevenueSaved: 11880,
    aiExplanation:
      "Ujjain Freeganj Express has only 2.000 units of Surf Excel Matic 2kg remaining (1.05d DOI). No regional peer store within 300 km holds > 30 days of excess inventory. Automated fallback routed this order to Central Supply / Mother Hub for direct replenishment of 24.000 units.",
    destStore: {
      id: "store-ujjain-007",
      name: "Ujjain Freeganj Express",
      code: "STR-UJJ-007",
      format: "EXPRESS",
      city: "Ujjain",
      state: "Madhya Pradesh",
      currentStock: 2,
      ads: 1.9,
      currentDOI: 1.05,
    },
    sourceStore: null,
    auditHistory: [
      {
        id: "aud-003",
        recommendationId: "rec-ujjain-central-003",
        previousStatus: null,
        newStatus: "GENERATED",
        changedBy: "SYS-CRON-0200",
        changedByName: "Nightly Rebalance Engine v2.4",
        changedByRole: "SYSTEM",
        changedOn: "2026-07-25T02:01:05.000Z",
        comments:
          "No donor store met 30.0d excess threshold; escalated to Central Supply / Mother Hub.",
      },
    ],
    createdOn: "2026-07-25T02:01:05.000Z",
    updatedOn: "2026-07-25T02:01:05.000Z",
  },
  {
    id: "rec-manual-store-req-004",
    recommendationNumber: "REC-20260725-0004",
    recommendationType: "MANUAL_STORE_REQUEST",
    priority: "MEDIUM",
    status: "REVIEWED",
    isManualRequest: true,
    requestedByStoreManagerName: "Vikramaditya Joshi (SM - Bhopal)",
    storeRequestReason:
      "Weekend Shravan festival footfall surge expected; shelf stock down to 6 packs on end-cap gondola.",
    productId: "prod-haldiram-bhujia-1kg",
    productName: "Haldiram's Bhujia Sev 1kg Family Pack",
    sku: "SKU-SNK-412",
    barcode: "8904063200554",
    categoryName: "Packaged Snacks & Namkeen",
    unitCost: 215,
    mrp: 290,
    toStoreId: "store-bhopal-004",
    toStoreName: "Bhopal DB Mall Store",
    toStoreCode: "STR-BPL-004",
    toStoreFormat: "HYPERMARKET",
    fromStoreId: "store-indore-001",
    fromStoreName: "Indore Vijay Nagar Hub",
    fromStoreCode: "STR-IDR-001",
    fromStoreFormat: "HYPERMARKET",
    recommendedQty: 15,
    approvedQty: null,
    destStockBefore: 6,
    destAds: 1.6,
    destDoiBefore: 3.75,
    destDoiAfter: 13.13,
    sourceStockBefore: 64,
    sourceAds: 1.5,
    sourceDoiBefore: 42.67,
    sourceDoiAfter: 32.67,
    distanceKm: 190,
    potentialRevenueSaved: 4350,
    aiExplanation:
      "Store Manager Vikramaditya Joshi requested 15.000 units of Haldiram's Bhujia Sev 1kg ahead of weekend festival traffic. Donor ranking identified Indore Vijay Nagar Hub (42.67d DOI) as optimal source at 190 km, lifting Bhopal from 3.75d to 13.13d DOI.",
    destStore: {
      id: "store-bhopal-004",
      name: "Bhopal DB Mall Store",
      code: "STR-BPL-004",
      format: "HYPERMARKET",
      city: "Bhopal",
      state: "Madhya Pradesh",
      currentStock: 6,
      ads: 1.6,
      currentDOI: 3.75,
    },
    sourceStore: {
      id: "store-indore-001",
      name: "Indore Vijay Nagar Hub",
      code: "STR-IDR-001",
      format: "HYPERMARKET",
      city: "Indore",
      state: "Madhya Pradesh",
      currentStock: 64,
      ads: 1.5,
      currentDOI: 42.67,
      distanceKm: 190,
    },
    auditHistory: [
      {
        id: "aud-004-a",
        recommendationId: "rec-manual-store-req-004",
        previousStatus: null,
        newStatus: "GENERATED",
        changedBy: "USR-SM-BPL04",
        changedByName: "Vikramaditya Joshi",
        changedByRole: "STORE_MANAGER",
        changedOn: "2026-07-25T07:40:00.000Z",
        comments:
          "Store Request submitted: Weekend Shravan festival footfall surge expected; shelf stock down to 6 packs.",
      },
      {
        id: "aud-004-b",
        recommendationId: "rec-manual-store-req-004",
        previousStatus: "GENERATED",
        newStatus: "REVIEWED",
        changedBy: "USR-RM-WEST",
        changedByName: "Ananya Deshmukh",
        changedByRole: "REGIONAL_MANAGER",
        changedOn: "2026-07-25T08:15:00.000Z",
        comments: "Verified donor availability at Indore Hub; queued for morning dispatch batch.",
      },
    ],
    createdOn: "2026-07-25T07:40:00.000Z",
    updatedOn: "2026-07-25T08:15:00.000Z",
  },
  {
    id: "rec-nagpur-approved-005",
    recommendationNumber: "REC-20260724-0089",
    recommendationType: "REBALANCE_TRANSFER",
    priority: "MEDIUM",
    status: "APPROVED",
    isManualRequest: false,
    requestedByStoreManagerName: null,
    storeRequestReason: null,
    productId: "prod-aashirvaad-atta-10kg",
    productName: "Aashirvaad Select Sharbati Atta 10kg",
    sku: "SKU-STA-118",
    barcode: "8901725121747",
    categoryName: "Staples & Flour",
    unitCost: 445,
    mrp: 565,
    toStoreId: "store-nagpur-003",
    toStoreName: "Nagpur Dharampeth Superstore",
    toStoreCode: "STR-NGP-003",
    toStoreFormat: "SUPERMARKET",
    fromStoreId: "store-jabalpur-005",
    fromStoreName: "Jabalpur Civic Center Hub",
    fromStoreCode: "STR-JBP-005",
    fromStoreFormat: "HYPERMARKET",
    recommendedQty: 14,
    approvedQty: 14,
    destStockBefore: 4,
    destAds: 1.5,
    destDoiBefore: 2.67,
    destDoiAfter: 12.0,
    sourceStockBefore: 52,
    sourceAds: 1.3,
    sourceDoiBefore: 40.0,
    sourceDoiAfter: 29.23,
    distanceKm: 274,
    potentialRevenueSaved: 7910,
    aiExplanation:
      "Nagpur Dharampeth Superstore required 14.000 bags of Aashirvaad 10kg to exit the < 3.0d stockout zone. Sourced from Jabalpur Civic Center Hub (274 km).",
    destStore: {
      id: "store-nagpur-003",
      name: "Nagpur Dharampeth Superstore",
      code: "STR-NGP-003",
      format: "SUPERMARKET",
      city: "Nagpur",
      state: "Maharashtra",
      currentStock: 4,
      ads: 1.5,
      currentDOI: 2.67,
    },
    sourceStore: {
      id: "store-jabalpur-005",
      name: "Jabalpur Civic Center Hub",
      code: "STR-JBP-005",
      format: "HYPERMARKET",
      city: "Jabalpur",
      state: "Madhya Pradesh",
      currentStock: 52,
      ads: 1.3,
      currentDOI: 40.0,
      distanceKm: 274,
    },
    auditHistory: [
      {
        id: "aud-005-a",
        recommendationId: "rec-nagpur-approved-005",
        previousStatus: null,
        newStatus: "GENERATED",
        changedBy: "SYS-CRON-0200",
        changedByName: "Nightly Rebalance Engine v2.4",
        changedByRole: "SYSTEM",
        changedOn: "2026-07-24T02:00:00.000Z",
        comments: "Generated during 02:00 AM regional rebalance sweep.",
      },
      {
        id: "aud-005-b",
        recommendationId: "rec-nagpur-approved-005",
        previousStatus: "GENERATED",
        newStatus: "APPROVED",
        changedBy: "USR-RM-WEST",
        changedByName: "Ananya Deshmukh",
        changedByRole: "REGIONAL_MANAGER",
        changedOn: "2026-07-24T10:22:00.000Z",
        comments: "Approved and auto-generated Stock Transfer TRF-20260724-0041.",
      },
    ],
    createdOn: "2026-07-24T02:00:00.000Z",
    updatedOn: "2026-07-24T10:22:00.000Z",
  },
];

function filterFallbackRecommendations(
  params: RecommendationQueryParams,
): PaginatedResponse<RecommendationDto> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);
  const search = (params.search ?? "").trim().toLowerCase();

  const filtered = FALLBACK_RECOMMENDATIONS.filter((rec) => {
    if (params.tab === "ALL_OPEN") {
      if (rec.status !== "GENERATED" && rec.status !== "REVIEWED") return false;
    } else if (params.tab === "HIGH_PRIORITY") {
      if (
        rec.priority !== "HIGH" ||
        (rec.status !== "GENERATED" && rec.status !== "REVIEWED")
      ) {
        return false;
      }
    } else if (params.tab === "STORE_REQUESTS") {
      if (!rec.isManualRequest) return false;
    } else if (params.tab === "COMPLETED_REJECTED") {
      if (
        rec.status !== "APPROVED" &&
        rec.status !== "MODIFIED" &&
        rec.status !== "REJECTED" &&
        rec.status !== "EXECUTED"
      ) {
        return false;
      }
    }

    if (params.priority && rec.priority !== params.priority) {
      return false;
    }
    if (params.status && rec.status !== params.status) {
      return false;
    }
    if (params.toStoreId && rec.toStoreId !== params.toStoreId) {
      return false;
    }

    if (search) {
      const haystack = [
        rec.recommendationNumber,
        rec.productName,
        rec.sku,
        rec.barcode,
        rec.toStoreName,
        rec.toStoreCode,
        rec.fromStoreName ?? "Central Supply Mother Hub",
        rec.fromStoreCode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function useRecommendations(params: RecommendationQueryParams) {
  return useQuery<PaginatedResponse<RecommendationDto>, Error>({
    queryKey: ACTION_CENTER_QUERY_KEYS.list(params),
    queryFn: async () => {
      try {
        return await actionCenterApi.getRecommendations(params);
      } catch {
        return filterFallbackRecommendations(params);
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
