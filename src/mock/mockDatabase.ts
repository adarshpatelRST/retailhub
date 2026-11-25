import rawSeedData from "./demo-seed-data.json";

// Storage Keys
const INIT_KEY = "retailhub_demo_db_initialized_v1";
const INVENTORY_KEY = "retailhub_demo_inventory_v1";
const RECS_KEY = "retailhub_demo_recs_v1";
const TRANSFERS_KEY = "retailhub_demo_transfers_v1";
const SALES_KEY = "retailhub_demo_sales_v1";
const AUDIT_KEY = "retailhub_demo_audit_v1";
const USERS_KEY = "retailhub_demo_users_v1";
const PRODUCTS_KEY = "retailhub_demo_products_v1";
const STORES_KEY = "retailhub_demo_stores_v1";
const CATEGORIES_KEY = "retailhub_demo_categories_v1";
const BRANDS_KEY = "retailhub_demo_brands_v1";
const MODEL_CONFIG_KEY = "retailhub_demo_model_config_v1";
const SCHEDULER_KEY = "retailhub_demo_scheduler_v1";

export const DEFAULT_DEMO_USERS = [
  {
    id: "usr-admin-ops",
    email: "admin@retailhub.com",
    fullName: "Ananya Deshmukh",
    role: "ADMIN",
    isActive: true,
    createdAt: "2026-01-15T08:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
    assignedRegions: [],
    assignedStores: [],
  },
  {
    id: "usr-exec-hq",
    email: "executive@retailhub.com",
    fullName: "Vikram Aditya",
    role: "EXECUTIVE",
    isActive: true,
    createdAt: "2026-01-15T08:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
    assignedRegions: [],
    assignedStores: [],
  },
  {
    id: "usr-rm-west",
    email: "regional.central@retailhub.com",
    fullName: "Priya Nair",
    role: "REGIONAL_MANAGER",
    isActive: true,
    createdAt: "2026-02-01T08:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
    assignedRegions: [{ id: "reg-mp-central", name: "Central MP Corridor" }],
    assignedStores: [],
  },
  {
    id: "usr-sm-bhopal",
    email: "store.bhopal@retailhub.com",
    fullName: "Rajesh Sharma",
    role: "STORE_MANAGER",
    isActive: true,
    createdAt: "2026-02-10T08:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
    assignedRegions: [],
    assignedStores: [{ id: "str-bhopal-01", name: "Bhopal Hypermarket", storeCode: "BHP-001" }],
  },
];

export interface DemoStore {
  id: string;
  storeCode: string;
  name: string;
  regionId: string;
  storeTypeId: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  openingDate: string;
  isActive: boolean;
}

export interface DemoProduct {
  id: string;
  sku: string;
  productCode: string;
  name: string;
  description: string;
  brandId: string;
  categoryId: string;
  unitOfMeasure: "PIECE" | "LITRE" | "KG" | "PACK";
  costPrice: string | number;
  sellingPrice: string | number;
  mrp: string | number;
  isActive: boolean;
}

export interface DemoInventoryItem {
  id: string;
  storeId: string;
  productId: string;
  availableQuantity: number | string;
  reservedQuantity: number | string;
  inTransitQuantity: number | string;
  minimumStock: number | string;
  maximumStock: number | string;
  reorderLevel: number | string;
  version: number;
  lastUpdatedOn: string;
}

export interface DemoRecommendation {
  id: string;
  recommendationNumber: string;
  recommendationType: "REBALANCE_TRANSFER" | "CENTRAL_REPLENISHMENT" | "MANUAL_STORE_REQUEST";
  storeId: string;
  productId: string;
  fromStoreId: string | null;
  toStoreId: string;
  recommendedQuantity: number | string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  status: "OPEN" | "GENERATED" | "REVIEWED" | "APPROVED" | "MODIFIED" | "REJECTED" | "EXECUTED" | "EXPIRED";
  isManualRequest: boolean;
  requestedByUserId: string | null;
  aiExplanation: string | null;
  stockTransferId: string | null;
  createdAt: string;
  updatedAt: string;
  evidence?: Array<{
    id: string;
    recommendationId: string;
    metric: string;
    value: string;
    threshold?: string | null;
    comparator?: string | null;
  }>;
}

export interface DemoTransfer {
  id: string;
  transferNumber: string;
  fromStoreId: string;
  toStoreId: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "RECEIVED" | "CANCELLED";
  carrierName: string | null;
  vehicleNumber: string | null;
  dispatchNoteNumber: string | null;
  estimatedArrival: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  receivedBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines: any[];
}

export interface DemoSale {
  id: string;
  transactionNumber: string;
  storeId: string;
  transactionDate: string;
  customerId: string | null;
  totalQuantity: number | string;
  totalAmount: number | string;
  lines: any[];
}

// Memory cache fallback for SSR / tests
let inMemoryCache: {
  inventory: DemoInventoryItem[];
  recommendations: DemoRecommendation[];
  transfers: DemoTransfer[];
  sales: DemoSale[];
  auditLogs: any[];
  users: any[];
  modelConfig: any;
} | null = null;

function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[MockDB] Failed to read ${key} from localStorage, using fallback`, e);
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[MockDB] Failed to save ${key} to localStorage`, e);
  }
}

// Master Static / Mutable Collections
export function getProductsList(): DemoProduct[] {
  if (typeof window === "undefined") {
    return (rawSeedData.products || []) as unknown as DemoProduct[];
  }
  return safeGetStorage<DemoProduct[]>(PRODUCTS_KEY, (rawSeedData.products || []) as unknown as DemoProduct[]);
}

export function saveProductsList(items: DemoProduct[]): void {
  safeSetStorage(PRODUCTS_KEY, items);
}

export function getStoresList(): DemoStore[] {
  if (typeof window === "undefined") {
    return (rawSeedData.stores || []) as unknown as DemoStore[];
  }
  return safeGetStorage<DemoStore[]>(STORES_KEY, (rawSeedData.stores || []) as unknown as DemoStore[]);
}

export function saveStoresList(items: DemoStore[]): void {
  safeSetStorage(STORES_KEY, items);
}

export function getCategoriesList(): any[] {
  if (typeof window === "undefined") {
    return (rawSeedData.categories || []) as any[];
  }
  return safeGetStorage<any[]>(CATEGORIES_KEY, (rawSeedData.categories || []) as any[]);
}

export function saveCategoriesList(items: any[]): void {
  safeSetStorage(CATEGORIES_KEY, items);
}

export function getBrandsList(): any[] {
  if (typeof window === "undefined") {
    return (rawSeedData.brands || []) as any[];
  }
  return safeGetStorage<any[]>(BRANDS_KEY, (rawSeedData.brands || []) as any[]);
}

export function saveBrandsList(items: any[]): void {
  safeSetStorage(BRANDS_KEY, items);
}

export function getUsersList(): any[] {
  if (typeof window === "undefined") {
    return DEFAULT_DEMO_USERS;
  }
  const users = safeGetStorage<any[]>(USERS_KEY, DEFAULT_DEMO_USERS);
  return (users && users.length > 0 ? users : DEFAULT_DEMO_USERS).map((u) => ({
    ...u,
    assignedRegions: u.assignedRegions ?? [],
    assignedStores: u.assignedStores ?? [],
  }));
}

export function saveUsersList(items: any[]): void {
  safeSetStorage(USERS_KEY, items);
}

export const masterData = {
  get regions() { return (rawSeedData.regions || []) as any[]; },
  get storeTypes() { return (rawSeedData.storeTypes || []) as any[]; },
  get stores() { return getStoresList(); },
  get categories() { return getCategoriesList(); },
  get brands() { return getBrandsList(); },
  get products() { return getProductsList(); },
};

// Fast Lookup Maps (Reactive to localStorage changes)
export const storesMap = {
  get(key: string): DemoStore | undefined {
    return getStoresList().find((s) => s.id === key || s.storeCode === key);
  },
  has(key: string): boolean {
    return getStoresList().some((s) => s.id === key || s.storeCode === key);
  },
  values(): DemoStore[] {
    return getStoresList();
  },
};

export const productsMap = {
  get(key: string): DemoProduct | undefined {
    return getProductsList().find((p) => p.id === key || p.sku === key || p.productCode === key);
  },
  has(key: string): boolean {
    return getProductsList().some((p) => p.id === key || p.sku === key || p.productCode === key);
  },
  values(): DemoProduct[] {
    return getProductsList();
  },
};

export const categoriesMap = {
  get(key: string): any | undefined {
    return getCategoriesList().find((c) => c.id === key || c.code === key || c.categoryCode === key);
  },
  has(key: string): boolean {
    return getCategoriesList().some((c) => c.id === key || c.code === key || c.categoryCode === key);
  },
  values(): any[] {
    return getCategoriesList();
  },
};

export const brandsMap = {
  get(key: string): any | undefined {
    return getBrandsList().find((b) => b.id === key || b.code === key || b.brandCode === key);
  },
  has(key: string): boolean {
    return getBrandsList().some((b) => b.id === key || b.code === key || b.brandCode === key);
  },
  values(): any[] {
    return getBrandsList();
  },
};

export const regionsMap = {
  get(key: string): any | undefined {
    return ((rawSeedData.regions || []) as any[]).find((r) => r.id === key || r.code === key || r.regionCode === key);
  },
  has(key: string): boolean {
    return ((rawSeedData.regions || []) as any[]).some((r) => r.id === key || r.code === key || r.regionCode === key);
  },
  values(): any[] {
    return (rawSeedData.regions || []) as any[];
  },
};

/**
 * Initialize Demo Database in localStorage if not already initialized
 */
export function initializeDemoDb(): void {
  if (typeof window === "undefined") return;

  const isInitialized = window.localStorage.getItem(INIT_KEY);
  if (!isInitialized) {
    console.info("[MockDB] Initializing fresh enterprise demo database in localStorage...");
    safeSetStorage(INVENTORY_KEY, rawSeedData.inventory || []);
    safeSetStorage(RECS_KEY, rawSeedData.recommendations || []);
    safeSetStorage(TRANSFERS_KEY, rawSeedData.transfers || []);
    safeSetStorage(SALES_KEY, rawSeedData.sales || []);
    safeSetStorage(AUDIT_KEY, rawSeedData.auditLogs || []);
    safeSetStorage(USERS_KEY, DEFAULT_DEMO_USERS);
    safeSetStorage(PRODUCTS_KEY, rawSeedData.products || []);
    safeSetStorage(STORES_KEY, rawSeedData.stores || []);
    safeSetStorage(CATEGORIES_KEY, rawSeedData.categories || []);
    safeSetStorage(BRANDS_KEY, rawSeedData.brands || []);
    safeSetStorage(SCHEDULER_KEY, getDefaultSchedulerState());
    safeSetStorage(MODEL_CONFIG_KEY, {
      activeModel: "gemini-2.5-flash",
      temperature: 0.1,
      maxOutputTokens: 1024,
      availableModels: [
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Production Default)", speed: "Fast (<1s)", accuracy: "94%" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Reasoning)", speed: "Balanced (~2s)", accuracy: "98%" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Ultra Fast)", speed: "Ultra Fast (<500ms)", accuracy: "91%" },
      ],
    });
    window.localStorage.setItem(INIT_KEY, "true");
  }
}

/**
 * Reset Demo Database back to clean baseline
 */
export function resetDemoDatabase(): void {
  if (typeof window === "undefined") return;
  console.info("[MockDB] Resetting demo database to pristine enterprise seed...");
  safeSetStorage(INVENTORY_KEY, rawSeedData.inventory || []);
  safeSetStorage(RECS_KEY, rawSeedData.recommendations || []);
  safeSetStorage(TRANSFERS_KEY, rawSeedData.transfers || []);
  safeSetStorage(SALES_KEY, rawSeedData.sales || []);
  safeSetStorage(AUDIT_KEY, rawSeedData.auditLogs || []);
  safeSetStorage(USERS_KEY, DEFAULT_DEMO_USERS);
  safeSetStorage(PRODUCTS_KEY, rawSeedData.products || []);
  safeSetStorage(STORES_KEY, rawSeedData.stores || []);
  safeSetStorage(CATEGORIES_KEY, rawSeedData.categories || []);
  safeSetStorage(BRANDS_KEY, rawSeedData.brands || []);
  safeSetStorage(SCHEDULER_KEY, getDefaultSchedulerState());
  window.localStorage.setItem(INIT_KEY, "true");
  inMemoryCache = null;
  window.dispatchEvent(new CustomEvent("retailhub:demo-reset"));
}

/**
 * Read active mutable collections
 */
export function getInventoryList(): DemoInventoryItem[] {
  if (typeof window === "undefined") {
    return (rawSeedData.inventory || []) as unknown as DemoInventoryItem[];
  }
  return safeGetStorage<DemoInventoryItem[]>(INVENTORY_KEY, (rawSeedData.inventory || []) as unknown as DemoInventoryItem[]);
}

export function saveInventoryList(items: DemoInventoryItem[]): void {
  safeSetStorage(INVENTORY_KEY, items);
}

export function getRecommendationsList(): DemoRecommendation[] {
  if (typeof window === "undefined") {
    return (rawSeedData.recommendations || []) as unknown as DemoRecommendation[];
  }
  return safeGetStorage<DemoRecommendation[]>(RECS_KEY, (rawSeedData.recommendations || []) as unknown as DemoRecommendation[]);
}

export function saveRecommendationsList(items: DemoRecommendation[]): void {
  safeSetStorage(RECS_KEY, items);
}

export function getTransfersList(): DemoTransfer[] {
  if (typeof window === "undefined") {
    return (rawSeedData.transfers || []) as unknown as DemoTransfer[];
  }
  return safeGetStorage<DemoTransfer[]>(TRANSFERS_KEY, (rawSeedData.transfers || []) as unknown as DemoTransfer[]);
}

export function saveTransfersList(items: DemoTransfer[]): void {
  safeSetStorage(TRANSFERS_KEY, items);
}

export function getSalesList(): DemoSale[] {
  if (typeof window === "undefined") {
    return (rawSeedData.sales || []) as unknown as DemoSale[];
  }
  return safeGetStorage<DemoSale[]>(SALES_KEY, (rawSeedData.sales || []) as unknown as DemoSale[]);
}

export function saveSalesList(items: DemoSale[]): void {
  safeSetStorage(SALES_KEY, items);
}

export function getAuditLogsList(): any[] {
  if (typeof window === "undefined") {
    return (rawSeedData.auditLogs || []) as any[];
  }
  return safeGetStorage<any[]>(AUDIT_KEY, (rawSeedData.auditLogs || []) as any[]);
}

export function addAuditLogEntry(entry: {
  action: string;
  entityName: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  userId?: string;
}): void {
  const list = getAuditLogsList();
  const newEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    correlationId: `demo-corr-${Date.now()}`,
    userId: entry.userId || "usr-admin-ops",
    action: entry.action,
    entityName: entry.entityName,
    entityId: entry.entityId,
    oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
    newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
    ipAddress: "127.0.0.1",
    timestamp: new Date().toISOString(),
  };
  list.unshift(newEntry);
  if (list.length > 300) list.pop();
  safeSetStorage(AUDIT_KEY, list);
}

export function getModelConfig(): any {
  return safeGetStorage(MODEL_CONFIG_KEY, {
    activeModel: "gemini-2.5-flash",
    temperature: 0.1,
    maxOutputTokens: 1024,
    availableModels: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Production Default)", speed: "Fast (<1s)", accuracy: "94%" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Reasoning)", speed: "Balanced (~2s)", accuracy: "98%" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Ultra Fast)", speed: "Ultra Fast (<500ms)", accuracy: "91%" },
    ],
  });
}

export function setModelConfig(model: string): any {
  const current = getModelConfig();
  current.activeModel = model;
  safeSetStorage(MODEL_CONFIG_KEY, current);
  return current;
}

export function getDefaultSchedulerState() {
  const now = Date.now();
  return {
    config: {
      enabled: true,
      mode: "BOTH",
      wavesEnabled: true,
      waveHours: ["02:00", "06:00", "14:00", "22:00"],
      hourlyEnabled: true,
      intervalValue: 30,
      intervalUnit: "MINUTES",
      hourlyIntervalHours: 1,
      hourlyIntervalMinutes: 30,
      autoExpire: true,
      safetyFloorDays: 7.0,
    },
    telemetry: {
      totalExecutions: 24,
      lastDurationMs: 1420,
      lastEvaluatedPairs: 4558,
      lastCreatedRecs: 6,
      lastAutoExpiredCount: 2,
      lastRunAt: new Date(now - 12 * 60 * 1000).toISOString(),
      lastRunType: "HOURLY",
      recentExecutions: [
        {
          id: "sweep-1001",
          timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
          type: "HOURLY",
          durationMs: 1380,
          evaluatedPairs: 4558,
          createdRecs: 4,
          autoExpiredCount: 1,
          summary: "HOURLY sweep completed in 1380ms (4558 pairs, 4 recommendations generated)",
        },
        {
          id: "sweep-1002",
          timestamp: new Date(now - 42 * 60 * 1000).toISOString(),
          type: "HOURLY",
          durationMs: 1450,
          evaluatedPairs: 4558,
          createdRecs: 2,
          autoExpiredCount: 0,
          summary: "HOURLY sweep completed in 1450ms (4558 pairs, 2 recommendations generated)",
        },
        {
          id: "sweep-1003",
          timestamp: new Date(now - 120 * 60 * 1000).toISOString(),
          type: "WAVE",
          durationMs: 1520,
          evaluatedPairs: 4558,
          createdRecs: 8,
          autoExpiredCount: 3,
          summary: "WAVE sweep (14:00) completed in 1520ms (4558 pairs, 8 recommendations generated)",
        },
      ],
    },
  };
}

export function getSchedulerState(): any {
  return safeGetStorage(SCHEDULER_KEY, getDefaultSchedulerState());
}

export function saveSchedulerState(state: any): void {
  safeSetStorage(SCHEDULER_KEY, state);
}

export function computeNextRunAt(config: any): string | null {
  if (!config?.enabled) return null;
  const now = new Date();
  const candidates: Date[] = [];

  if (config.wavesEnabled && Array.isArray(config.waveHours)) {
    for (const waveTime of config.waveHours) {
      const parts = waveTime.split(":");
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1] || "0", 10);
      const target = new Date(now);
      target.setHours(hh, mm, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      candidates.push(target);
    }
  }

  if (config.hourlyEnabled) {
    const mins = config.intervalUnit === "MINUTES" ? Number(config.intervalValue || 30) : Number(config.intervalValue || 1) * 60;
    candidates.push(new Date(now.getTime() + mins * 60 * 1000));
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.getTime() - b.getTime());
    return candidates[0].toISOString();
  }

  return new Date(now.getTime() + 1800 * 1000).toISOString();
}
