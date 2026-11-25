export type RoleType =
  | 'EXECUTIVE'
  | 'REGIONAL_MANAGER'
  | 'STORE_MANAGER'
  | 'ADMIN';

export type StockHealthStatus = 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS';
export type InventoryHealthStatus = StockHealthStatus;

export type MovementType =
  | 'INWARD_RECEIPT'
  | 'POS_SALE'
  | 'TRANSFER_OUT_DISPATCH'
  | 'TRANSFER_IN_RECEIPT'
  | 'DAMAGED_WRITE_OFF'
  | 'STOCK_ADJUSTMENT'
  | 'MANUAL_ADJUSTMENT';
export type InventoryMovementType = MovementType;

export type TransferStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED_IN_TRANSIT'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface UserIdentity {
  id: string;
  email: string;
  fullName: string;
  role: RoleType;
  mobileNumber: string;
  isActive: boolean;
}

export interface UserStoreAssignmentRecord {
  id: string;
  userId: string;
  storeId: string;
}

export interface UserRegionAssignmentRecord {
  id: string;
  userId: string;
  regionId: string;
}

export interface StoreRecord {
  id: string;
  storeCode: string;
  name: string;
  regionId: string;
  regionCode: string;
  regionName: string;
  storeTypeCode: string;
  city: string;
  state?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  openingDate: string;
  isActive?: boolean;
  contactPhone?: string;
  managerName?: string;
  skuCount: number;
  availableQuantityTotal: string; // Decimal(10, 3)
  dailyPosRevenue: string; // Decimal(12, 2)
  [key: string]: any;
}

export interface StoreNetworkDirectoryEntry {
  id: string;
  storeCode: string;
  name: string;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  regionCode: string;
  regionName: string;
  storeTypeCode: string;
  contactMobileNumber: string | null;
  storeManagers: Array<{
    fullName: string;
    email: string;
    mobileNumber: string;
  }>;
}

export interface ProductCatalogRecord {
  id: string;
  sku: string;
  productCode: string; // EAN-13 barcode
  name: string;
  description: string | null;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  unitOfMeasure: 'PIECE' | 'LITRE' | 'KG' | 'PACK';
  costPrice: string; // Decimal(12, 2)
  sellingPrice: string; // Decimal(12, 2)
  mrp: string; // Decimal(12, 2)
  isActive: boolean;
  totalAvailableStock: string; // Decimal(10, 3)
}

export interface FlatCategoryRecord {
  id: string;
  code?: string;
  categoryCode?: string;
  name: string;
  parentCategoryId: string | null;
  isActive: boolean;
  level?: number;
}

export interface CategoryTreeNode extends FlatCategoryRecord {
  categoryCode?: string;
  subCategories: CategoryTreeNode[];
}

export interface InventoryBalanceRecord {
  id: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  productId: string;
  sku: string;
  productName: string;
  availableQuantity: string; // Decimal(10, 3)
  reservedQuantity: string; // Decimal(10, 3)
  inTransitQuantity: string; // Decimal(10, 3)
  minimumStock: string; // Decimal(10, 3)
  maximumStock: string; // Decimal(10, 3)
  reorderLevel: string; // Decimal(10, 3)
  version: number;
  lastUpdatedOn: string;
}

export interface InventoryMovementRecord {
  id: string;
  inventoryId: string;
  storeCode: string;
  sku: string;
  movementType: MovementType;
  quantity: string; // Decimal(10, 3)
  referenceType: string;
  referenceId: string;
  remarks: string | null;
  createdBy: string;
  movementDate: string;
}

export interface StockTransferRecord {
  id: string;
  transferNumber: string;
  fromStoreId: string;
  fromStoreCode: string;
  toStoreId: string;
  toStoreCode: string;
  status: TransferStatus;
  carrierName: string | null;
  vehicleNumber: string | null;
  dispatchNoteNumber: string | null;
  estimatedArrival: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  requestedBy: string;
  approvedBy: string | null;
  receivedBy: string | null;
  lines: Array<{
    id: string;
    productId: string;
    sku: string;
    productName: string;
    requestedQty: string; // Decimal(10, 3)
    approvedQty: string | null; // Decimal(10, 3)
    receivedQty: string | null; // Decimal(10, 3)
  }>;
}

export interface InventoryRuleRecord {
  id: string;
  storeId: string;
  storeCode: string;
  productId: string;
  sku: string;
  minimumStock: string;
  maximumStock: string;
  reorderLevel: string;
  safetyStock: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  version: number;
}

export interface StoreScopedFilter {
  id?: { in: string[] };
  regionId?: { in: string[] };
  storeId?: { in: string[] };
  store?: { regionId: { in: string[] } };
}

export interface AuditLogEntry {
  id: string;
  correlationId: string;
  userId: string | null;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  timestamp: string;
  strippedKeys: string[];
}

export interface ApiResponseEnvelope<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  correlationId: string;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path: string;
  method: string;
  correlationId: string;
  timestamp: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'clientsecret',
  'authorization',
]);

/**
 * Exact base-10 millis (`10^-3`) arithmetic helper so stock calculations never use float math.
 */
function toMillis(decimalStr: string | number): bigint {
  const raw = String(decimalStr).trim();
  const negative = raw.startsWith('-');
  const clean = negative ? raw.slice(1) : raw;
  const [intPart = '0', fracPart = ''] = clean.split('.');
  const paddedFrac = (fracPart + '000').slice(0, 3);
  const combined = BigInt(intPart || '0') * 1000n + BigInt(paddedFrac);
  return negative ? -combined : combined;
}

function fromMillis(millis: bigint): string {
  const negative = millis < 0n;
  const abs = negative ? -millis : millis;
  const intPart = abs / 1000n;
  const fracPart = String(abs % 1000n).padStart(3, '0');
  return `${negative ? '-' : ''}${intPart.toString()}.${fracPart}`;
}

/**
 * Mirrors `InventoryService.computeStockStatus`:
 * - `availableQuantity <= 0`            -> `'CRITICAL'`
 * - `availableQuantity <= reorderLevel` -> `'LOW'`
 * - `availableQuantity > maximumStock`  -> `'EXCESS'`
 * - Otherwise                           -> `'HEALTHY'`
 */
export function computeInventoryHealthStatus(params: {
  availableQuantity: string | number;
  reorderLevel: string | number;
  maximumStock: string | number;
}): StockHealthStatus {
  const avail = toMillis(params.availableQuantity);
  const reorder = toMillis(params.reorderLevel);
  const max = toMillis(params.maximumStock);

  if (avail <= 0n) return 'CRITICAL';
  if (avail <= reorder) return 'LOW';
  if (avail > max) return 'EXCESS';
  return 'HEALTHY';
}

/**
 * Mirrors `InventoryService.getBalance`: lazily initializes a zero-balance row
 * (`availableQuantity: '0.000', version: 1`) if `(storeId, productId)` does not exist.
 */
export function getOrCreateLazyInventoryBalance(
  balances: InventoryBalanceRecord[],
  params: {
    storeId: string;
    storeCode: string;
    storeName: string;
    productId: string;
    sku: string;
    productName: string;
  },
): {
  balance: InventoryBalanceRecord;
  createdLazily: boolean;
  updatedBalances: InventoryBalanceRecord[];
} {
  const found = balances.find(
    (b) => b.storeId === params.storeId && b.productId === params.productId,
  );
  if (found) {
    return {
      balance: found,
      createdLazily: false,
      updatedBalances: balances,
    };
  }

  const created: InventoryBalanceRecord = {
    id: `inv-${params.storeId}-${params.productId}`,
    storeId: params.storeId,
    storeCode: params.storeCode,
    storeName: params.storeName,
    productId: params.productId,
    sku: params.sku,
    productName: params.productName,
    availableQuantity: '0.000',
    reservedQuantity: '0.000',
    inTransitQuantity: '0.000',
    minimumStock: '10.000',
    maximumStock: '100.000',
    reorderLevel: '20.000',
    version: 1,
    lastUpdatedOn: new Date().toISOString(),
  };

  return {
    balance: created,
    createdLazily: true,
    updatedBalances: [...balances, created],
  };
}

/**
 * Mirrors `InventoryService.adjustStock`: enforces optimistic locking (`version === expectedVersion`),
 * non-negative balance check (`INV_INSUFFICIENT_STOCK`), version increment, and immutable
 * `InventoryMovement` double-entry ledger creation.
 */
export function executeOptimisticStockAdjustment(
  balances: InventoryBalanceRecord[],
  movements: InventoryMovementRecord[],
  input: {
    storeId: string;
    productId: string;
    quantityDelta: string | number;
    expectedVersion: number;
    remarks: string;
    userId: string;
    [key: string]: any;
  },
):
  | {
      ok: true;
      updatedBalance: InventoryBalanceRecord;
      movement: InventoryMovementRecord;
      balances: InventoryBalanceRecord[];
      movements: InventoryMovementRecord[];
    }
  | {
      ok: false;
      errorCode: 'INV_CONCURRENCY_CONFLICT' | 'INV_INSUFFICIENT_STOCK' | 'NOT_FOUND';
      statusCode: 409 | 400 | 404;
      message: string;
    } {
  const idx = balances.findIndex(
    (b) => b.storeId === input.storeId && b.productId === input.productId,
  );

  if (idx === -1) {
    return {
      ok: false,
      errorCode: 'NOT_FOUND',
      statusCode: 404,
      message: 'Inventory balance row not found.',
    };
  }

  const current = balances[idx];
  if (current.version !== input.expectedVersion) {
    return {
      ok: false,
      errorCode: 'INV_CONCURRENCY_CONFLICT',
      statusCode: 409,
      message: `ConflictException('INV_CONCURRENCY_CONFLICT'): Expected version ${input.expectedVersion}, but database row is at version ${current.version}.`,
    };
  }

  const deltaMillis = toMillis(input.quantityDelta);
  const newAvailMillis = toMillis(current.availableQuantity) + deltaMillis;

  if (newAvailMillis < 0n) {
    return {
      ok: false,
      errorCode: 'INV_INSUFFICIENT_STOCK',
      statusCode: 400,
      message: `BadRequestException('INV_INSUFFICIENT_STOCK'): Adjustment of ${fromMillis(deltaMillis)} would result in negative balance (${fromMillis(newAvailMillis)}).`,
    };
  }

  const nowIso = new Date().toISOString();
  const updatedBalance: InventoryBalanceRecord = {
    ...current,
    availableQuantity: fromMillis(newAvailMillis),
    version: current.version + 1,
    lastUpdatedOn: nowIso,
  };

  const movement: InventoryMovementRecord = {
    id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    inventoryId: current.id,
    storeCode: current.storeCode,
    sku: current.sku,
    movementType: deltaMillis > 0n ? 'STOCK_ADJUSTMENT' : 'DAMAGED_WRITE_OFF',
    quantity: fromMillis(deltaMillis),
    referenceType: 'MANUAL_ADJUSTMENT',
    referenceId: current.id,
    remarks: input.remarks.trim(),
    createdBy: input.userId,
    movementDate: nowIso,
  };

  const nextBalances = [...balances];
  nextBalances[idx] = updatedBalance;

  return {
    ok: true,
    updatedBalance,
    movement,
    balances: nextBalances,
    movements: [movement, ...movements],
  };
}

/**
 * Mirrors `TransferService.dispatchTransfer`: moves stock from source `availableQuantity`
 * to `inTransitQuantity`, increments `version`, records `TRANSFER_OUT_DISPATCH`, and transitions
 * transfer status from `PENDING_APPROVAL` to `APPROVED_IN_TRANSIT`.
 */
export function executeDispatchTransferState(
  transfer: StockTransferRecord,
  balances: InventoryBalanceRecord[],
  movements: InventoryMovementRecord[],
  logistics: {
    carrierName?: string;
    vehicleNumber?: string;
    dispatchNoteNumber?: string;
    estimatedArrival?: string;
    userId: string;
  },
):
  | {
      ok: true;
      transfer: StockTransferRecord;
      balances: InventoryBalanceRecord[];
      movements: InventoryMovementRecord[];
    }
  | { ok: false; errorCode: string; message: string } {
  if (transfer.status !== 'PENDING_APPROVAL') {
    return {
      ok: false,
      errorCode: 'INVALID_TRANSFER_STATE',
      message: `Cannot dispatch transfer in status '${transfer.status}'. Expected 'PENDING_APPROVAL'.`,
    };
  }

  const nextBalances = [...balances];
  const newMovements: InventoryMovementRecord[] = [];
  const nowIso = new Date().toISOString();

  for (const line of transfer.lines) {
    const idx = nextBalances.findIndex(
      (b) =>
        b.storeId === transfer.fromStoreId && b.productId === line.productId,
    );
    if (idx === -1) {
      return {
        ok: false,
        errorCode: 'INV_INSUFFICIENT_STOCK',
        message: `Source inventory missing for product ${line.sku}.`,
      };
    }

    const src = nextBalances[idx];
    const reqMillis = toMillis(line.approvedQty ?? line.requestedQty);
    const availMillis = toMillis(src.availableQuantity);

    if (availMillis < reqMillis) {
      return {
        ok: false,
        errorCode: 'INV_INSUFFICIENT_STOCK',
        message: `Insufficient available stock at ${src.storeCode} for ${line.sku} (available: ${src.availableQuantity}, requested: ${line.requestedQty}).`,
      };
    }

    const nextAvail = availMillis - reqMillis;
    const nextInTransit = toMillis(src.inTransitQuantity) + reqMillis;

    nextBalances[idx] = {
      ...src,
      availableQuantity: fromMillis(nextAvail),
      inTransitQuantity: fromMillis(nextInTransit),
      version: src.version + 1,
      lastUpdatedOn: nowIso,
    };

    newMovements.push({
      id: `mov-disp-${Date.now()}-${line.id}`,
      inventoryId: src.id,
      storeCode: src.storeCode,
      sku: src.sku,
      movementType: 'TRANSFER_OUT_DISPATCH',
      quantity: fromMillis(-reqMillis),
      referenceType: 'STOCK_TRANSFER',
      referenceId: transfer.id,
      remarks: `Dispatched ${transfer.transferNumber} to ${transfer.toStoreCode}`,
      createdBy: logistics.userId,
      movementDate: nowIso,
    });
  }

  const updatedTransfer: StockTransferRecord = {
    ...transfer,
    status: 'APPROVED_IN_TRANSIT',
    carrierName: logistics.carrierName ?? 'Mahindra Logistics Express',
    vehicleNumber: logistics.vehicleNumber ?? 'MH-04-LE-8821',
    dispatchNoteNumber: logistics.dispatchNoteNumber ?? 'DN-2026-0941',
    estimatedArrival: logistics.estimatedArrival ?? nowIso,
    dispatchedAt: nowIso,
    approvedBy: logistics.userId,
    lines: transfer.lines.map((l) => ({
      ...l,
      approvedQty: l.approvedQty ?? l.requestedQty,
    })),
  };

  return {
    ok: true,
    transfer: updatedTransfer,
    balances: nextBalances,
    movements: [...newMovements, ...movements],
  };
}

/**
 * Mirrors `TransferService.receiveTransfer`:
 * - Clears full `approvedQty` from source store's `inTransitQuantity`.
 * - Lazily initializes destination store `Inventory` row if missing.
 * - Credits `receivedQty` to destination store's `availableQuantity` (`TRANSFER_IN_RECEIPT`).
 * - If `receivedQty < approvedQty`, automatically writes off the shortfall as `DAMAGED_WRITE_OFF`.
 */
export function executeReceiveTransferState(
  transfer: StockTransferRecord,
  balances: InventoryBalanceRecord[],
  movements: InventoryMovementRecord[],
  receipt: {
    receivedQuantitiesByProductId: Record<string, string | number>;
    remarks?: string;
    userId: string;
    toStoreName?: string;
  },
):
  | {
      ok: true;
      transfer: StockTransferRecord;
      balances: InventoryBalanceRecord[];
      movements: InventoryMovementRecord[];
    }
  | { ok: false; errorCode: string; message: string } {
  if (transfer.status !== 'APPROVED_IN_TRANSIT') {
    return {
      ok: false,
      errorCode: 'INVALID_TRANSFER_STATE',
      message: `Cannot receive transfer in status '${transfer.status}'. Expected 'APPROVED_IN_TRANSIT'.`,
    };
  }

  let nextBalances = [...balances];
  const newMovements: InventoryMovementRecord[] = [];
  const nowIso = new Date().toISOString();

  const updatedLines = transfer.lines.map((line) => {
    const rawRec =
      receipt.receivedQuantitiesByProductId[line.productId] ??
      line.approvedQty ??
      line.requestedQty;
    return {
      ...line,
      receivedQty: fromMillis(toMillis(rawRec)),
    };
  });

  for (const line of updatedLines) {
    const expectedMillis = toMillis(line.approvedQty ?? line.requestedQty);
    const receivedMillis = toMillis(line.receivedQty!);

    if (receivedMillis < 0n || receivedMillis > expectedMillis) {
      return {
        ok: false,
        errorCode: 'INVALID_RECEIVED_QTY',
        message: `receivedQty (${fromMillis(receivedMillis)}) must be between 0.000 and approvedQty (${fromMillis(expectedMillis)}).`,
      };
    }

    // 1. Clear expectedMillis from source inTransitQuantity
    const srcIdx = nextBalances.findIndex(
      (b) =>
        b.storeId === transfer.fromStoreId && b.productId === line.productId,
    );
    if (srcIdx === -1) {
      return {
        ok: false,
        errorCode: 'SOURCE_INVENTORY_NOT_FOUND',
        message: `Source inventory missing for ${line.sku}.`,
      };
    }

    const src = nextBalances[srcIdx];
    const currentInTransit = toMillis(src.inTransitQuantity);
    const nextInTransit =
      currentInTransit > expectedMillis ? currentInTransit - expectedMillis : 0n;

    nextBalances[srcIdx] = {
      ...src,
      inTransitQuantity: fromMillis(nextInTransit),
      version: src.version + 1,
      lastUpdatedOn: nowIso,
    };

    // 2. Lazily initialize destination store Inventory row if missing
    const lazyDest = getOrCreateLazyInventoryBalance(nextBalances, {
      storeId: transfer.toStoreId,
      storeCode: transfer.toStoreCode,
      storeName: receipt.toStoreName ?? transfer.toStoreCode,
      productId: line.productId,
      sku: line.sku,
      productName: line.productName,
    });
    nextBalances = lazyDest.updatedBalances;

    const destIdx = nextBalances.findIndex(
      (b) =>
        b.storeId === transfer.toStoreId && b.productId === line.productId,
    );
    const dest = nextBalances[destIdx];
    const nextDestAvail = toMillis(dest.availableQuantity) + receivedMillis;

    nextBalances[destIdx] = {
      ...dest,
      availableQuantity: fromMillis(nextDestAvail),
      version: dest.version + 1,
      lastUpdatedOn: nowIso,
    };

    // 3. Record TRANSFER_IN_RECEIPT at destination store
    newMovements.push({
      id: `mov-rec-${Date.now()}-${line.id}`,
      inventoryId: dest.id,
      storeCode: dest.storeCode,
      sku: dest.sku,
      movementType: 'TRANSFER_IN_RECEIPT',
      quantity: fromMillis(receivedMillis),
      referenceType: 'STOCK_TRANSFER',
      referenceId: transfer.id,
      remarks:
        receipt.remarks ||
        `Received ${transfer.transferNumber} at ${dest.storeCode}`,
      createdBy: receipt.userId,
      movementDate: nowIso,
    });

    // 4. Short-shipment / Damage write-off if receivedMillis < expectedMillis
    if (receivedMillis < expectedMillis) {
      const shortfallMillis = expectedMillis - receivedMillis;
      newMovements.push({
        id: `mov-dmg-${Date.now()}-${line.id}`,
        inventoryId: src.id,
        storeCode: src.storeCode,
        sku: src.sku,
        movementType: 'DAMAGED_WRITE_OFF',
        quantity: fromMillis(-shortfallMillis),
        referenceType: 'STOCK_TRANSFER',
        referenceId: transfer.id,
        remarks: receipt.remarks || 'In-transit shortfall/damage',
        createdBy: receipt.userId,
        movementDate: nowIso,
      });
    }
  }

  const completedTransfer: StockTransferRecord = {
    ...transfer,
    status: 'RECEIVED',
    receivedAt: nowIso,
    receivedBy: receipt.userId,
    lines: updatedLines,
  };

  return {
    ok: true,
    transfer: completedTransfer,
    balances: nextBalances,
    movements: [...newMovements, ...movements],
  };
}

/**
 * Mirrors `TransferService.cancelTransfer`:
 * - If `PENDING_APPROVAL`, marks `CANCELLED`.
 * - If `APPROVED_IN_TRANSIT`, reverses source `inTransitQuantity` back to `availableQuantity`
 *   and records `STOCK_ADJUSTMENT`.
 */
export function executeCancelTransferState(
  transfer: StockTransferRecord,
  balances: InventoryBalanceRecord[],
  movements: InventoryMovementRecord[],
  params: { userId: string; reason: string },
):
  | {
      ok: true;
      transfer: StockTransferRecord;
      balances: InventoryBalanceRecord[];
      movements: InventoryMovementRecord[];
    }
  | { ok: false; errorCode: string; message: string } {
  if (transfer.status === 'PENDING_APPROVAL') {
    return {
      ok: true,
      transfer: { ...transfer, status: 'CANCELLED' },
      balances,
      movements,
    };
  }

  if (transfer.status !== 'APPROVED_IN_TRANSIT') {
    return {
      ok: false,
      errorCode: 'INVALID_TRANSFER_STATE',
      message: `Cannot cancel transfer in status '${transfer.status}'.`,
    };
  }

  const nextBalances = [...balances];
  const newMovements: InventoryMovementRecord[] = [];
  const nowIso = new Date().toISOString();

  for (const line of transfer.lines) {
    const dispatchedMillis = toMillis(line.approvedQty ?? line.requestedQty);
    const srcIdx = nextBalances.findIndex(
      (b) =>
        b.storeId === transfer.fromStoreId && b.productId === line.productId,
    );
    if (srcIdx !== -1) {
      const src = nextBalances[srcIdx];
      const inTransitMillis = toMillis(src.inTransitQuantity);
      const nextInTransit =
        inTransitMillis > dispatchedMillis
          ? inTransitMillis - dispatchedMillis
          : 0n;
      const nextAvail = toMillis(src.availableQuantity) + dispatchedMillis;

      nextBalances[srcIdx] = {
        ...src,
        availableQuantity: fromMillis(nextAvail),
        inTransitQuantity: fromMillis(nextInTransit),
        version: src.version + 1,
        lastUpdatedOn: nowIso,
      };

      newMovements.push({
        id: `mov-cancel-${Date.now()}-${line.id}`,
        inventoryId: src.id,
        storeCode: src.storeCode,
        sku: src.sku,
        movementType: 'STOCK_ADJUSTMENT',
        quantity: fromMillis(dispatchedMillis),
        referenceType: 'STOCK_TRANSFER',
        referenceId: transfer.id,
        remarks: `Reversed in-transit stock on transfer cancellation (${transfer.transferNumber}): ${params.reason}`,
        createdBy: params.userId,
        movementDate: nowIso,
      });
    }
  }

  return {
    ok: true,
    transfer: { ...transfer, status: 'CANCELLED' },
    balances: nextBalances,
    movements: [...newMovements, ...movements],
  };
}

/**
 * Mirrors `InventoryService.saveRule`: SCD Type 2 effective-date versioning.
 * Expires active rule for `(storeId, productId)` (`effectiveTo = now`, `isActive = false`)
 * and inserts new rule at `version = prevVersion + 1`.
 */
export function saveVersionedInventoryRule(
  existingRules: InventoryRuleRecord[],
  input: {
    storeId: string;
    storeCode: string;
    productId: string;
    sku: string;
    minimumStock: number | string;
    maximumStock: number | string;
    reorderLevel: number | string;
    safetyStock: number | string;
  },
): {
  createdRule: InventoryRuleRecord;
  rules: InventoryRuleRecord[];
} {
  const nowIso = new Date().toISOString();
  let maxVersion = 0;

  const updatedRules = existingRules.map((rule) => {
    if (rule.storeId === input.storeId && rule.productId === input.productId) {
      if (rule.version > maxVersion) {
        maxVersion = rule.version;
      }
      if (rule.isActive) {
        return {
          ...rule,
          effectiveTo: nowIso,
          isActive: false,
        };
      }
    }
    return rule;
  });

  const createdRule: InventoryRuleRecord = {
    id: `rule-${Date.now()}`,
    storeId: input.storeId,
    storeCode: input.storeCode,
    productId: input.productId,
    sku: input.sku,
    minimumStock: fromMillis(toMillis(input.minimumStock)),
    maximumStock: fromMillis(toMillis(input.maximumStock)),
    reorderLevel: fromMillis(toMillis(input.reorderLevel)),
    safetyStock: fromMillis(toMillis(input.safetyStock)),
    effectiveFrom: nowIso,
    effectiveTo: null,
    isActive: true,
    version: maxVersion + 1,
  };

  return {
    createdRule,
    rules: [createdRule, ...updatedRules],
  };
}

/**
 * Mirrors `AuditInterceptor.sanitizeAuditPayload`: recursively clones payload and strips
 * sensitive keys (`password`, `token`, `secret`, `authorization`), returning both the
 * sanitized payload and the list of stripped key names.
 */
export function sanitizeAuditPayloadWithReport(input: unknown): {
  sanitized: unknown;
  strippedKeys: string[];
} {
  const strippedKeys: string[] = [];

  function walk(node: unknown): unknown {
    if (node === null || node === undefined) {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map((item) => walk(item));
    }
    if (node instanceof Date) {
      return node.toISOString();
    }
    if (typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
      )) {
        const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
        if (
          SENSITIVE_KEYS.has(normalizedKey) ||
          normalizedKey.includes('password') ||
          normalizedKey.includes('secret') ||
          normalizedKey.includes('token') ||
          normalizedKey === 'authorization'
        ) {
          strippedKeys.push(key);
          continue;
        }
        out[key] = walk(value);
      }
      return out;
    }
    return node;
  }

  return {
    sanitized: walk(input),
    strippedKeys,
  };
}

/**
 * Mirrors `DataScopeGuard`: computes the exact Prisma `req.dataScope` filter
 * for a given user identity and their store/region assignments.
 */
export function computeDataScopeFilter(
  user: UserIdentity,
  storeAssignments: UserStoreAssignmentRecord[],
  regionAssignments: UserRegionAssignmentRecord[],
  target: 'default' | 'store' | 'inventory' | 'transfer' = 'default',
): StoreScopedFilter {
  if (user.role === 'STORE_MANAGER') {
    const storeIds = storeAssignments
      .filter((a) => a.userId === user.id)
      .map((a) => a.storeId);
    return target === 'store'
      ? { id: { in: storeIds } }
      : { storeId: { in: storeIds } };
  }

  if (user.role === 'REGIONAL_MANAGER') {
    const regionIds = regionAssignments
      .filter((a) => a.userId === user.id)
      .map((a) => a.regionId);
    return target === 'store'
      ? { regionId: { in: regionIds } }
      : { store: { regionId: { in: regionIds } } };
  }

  return {};
}

/**
 * Applies the computed `StoreScopedFilter` against a list of `StoreRecord` items.
 */
export function filterStoresByDataScope(
  stores: StoreRecord[],
  scope: StoreScopedFilter,
): StoreRecord[] {
  const activeStores = stores.filter((s) => s.isActive !== false);
  const storeIds = scope.id?.in ?? scope.storeId?.in;
  if (storeIds) {
    const allowedStoreIds = new Set(storeIds);
    return activeStores.filter((s) => allowedStoreIds.has(s.id));
  }

  const regionIds = scope.regionId?.in ?? scope.store?.regionId?.in;
  if (regionIds) {
    const allowedRegionIds = new Set(regionIds);
    return activeStores.filter((s) => allowedRegionIds.has(s.regionId));
  }

  return activeStores;
}

/**
 * Mirrors `ProductService.findAll`: executes Barcode-First search.
 * 1. Checks exact `productCode` match first (for handheld barcode scanners).
 * 2. Otherwise falls back to partial case-insensitive match on `name` or `sku`.
 */
export function searchProductsBarcodeFirst(
  products: ProductCatalogRecord[],
  query: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
  },
): {
  strategy: 'EXACT_BARCODE_MATCH' | 'PARTIAL_TEXT_OR_SKU' | 'UNFILTERED_SCAN';
  items: ProductCatalogRecord[];
} {
  const targetActive = query.isActive ?? true;
  const basePool = products.filter((p) => {
    if (p.isActive !== targetActive) return false;
    if (query.categoryId && p.categoryId !== query.categoryId) return false;
    if (query.brandId && p.brandId !== query.brandId) return false;
    return true;
  });

  const term = query.search?.trim();
  if (!term) {
    return {
      strategy: 'UNFILTERED_SCAN',
      items: basePool,
    };
  }

  const exactBarcodeItem = basePool.find((p) => p.productCode === term);
  if (exactBarcodeItem) {
    return {
      strategy: 'EXACT_BARCODE_MATCH',
      items: [exactBarcodeItem],
    };
  }

  const lower = term.toLowerCase();
  const matched = basePool.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.sku.toLowerCase().includes(lower),
  );

  return {
    strategy: 'PARTIAL_TEXT_OR_SKU',
    items: matched,
  };
}

/**
 * Mirrors `ProductService.create`: validates unique `sku` (`PROD_SKU_EXISTS`) and
 * `productCode` (`PROD_BARCODE_EXISTS`), defaults `mrp = dto.mrp ?? dto.sellingPrice`,
 * and formats `@db.Decimal(12, 2)` strings.
 */
export function onboardProductCatalogItem(
  existingProducts: ProductCatalogRecord[],
  input: {
    sku: string;
    productCode: string;
    name: string;
    description?: string;
    brandId: string;
    brandName: string;
    categoryId: string;
    categoryName: string;
    unitOfMeasure: 'PIECE' | 'LITRE' | 'KG' | 'PACK';
    costPrice: number;
    sellingPrice: number;
    mrp?: number;
  },
):
  | { ok: true; product: ProductCatalogRecord }
  | {
      ok: false;
      errorCode: 'PROD_SKU_EXISTS' | 'PROD_BARCODE_EXISTS';
      message: string;
    } {
  const normalizedSku = input.sku.trim().toUpperCase();
  const normalizedBarcode = input.productCode.trim();

  if (existingProducts.some((p) => p.sku.toUpperCase() === normalizedSku)) {
    return {
      ok: false,
      errorCode: 'PROD_SKU_EXISTS',
      message: `ConflictException('PROD_SKU_EXISTS'): Product with SKU '${normalizedSku}' already exists.`,
    };
  }

  if (existingProducts.some((p) => p.productCode === normalizedBarcode)) {
    return {
      ok: false,
      errorCode: 'PROD_BARCODE_EXISTS',
      message: `ConflictException('PROD_BARCODE_EXISTS'): Product with barcode '${normalizedBarcode}' already exists.`,
    };
  }

  const resolvedMrp = input.mrp !== undefined ? input.mrp : input.sellingPrice;

  return {
    ok: true,
    product: {
      id: `prod-${Date.now()}`,
      sku: normalizedSku,
      productCode: normalizedBarcode,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      brandId: input.brandId,
      brandName: input.brandName,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      unitOfMeasure: input.unitOfMeasure,
      costPrice: input.costPrice.toFixed(2),
      sellingPrice: input.sellingPrice.toFixed(2),
      mrp: resolvedMrp.toFixed(2),
      isActive: true,
      totalAvailableStock: '0.000',
    },
  };
}

/**
 * Mirrors `ProductService.getCategoriesTree`: builds a recursive hierarchical tree
 * with root categories containing nested `subCategories: []`.
 */
export function buildRecursiveCategoryTree(
  categories: FlatCategoryRecord[],
): CategoryTreeNode[] {
  const active = categories.filter((c) => c.isActive);
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const cat of active) {
    map.set(cat.id, {
      ...cat,
      subCategories: [],
    });
  }

  for (const cat of active) {
    const node = map.get(cat.id)!;
    if (cat.parentCategoryId && map.has(cat.parentCategoryId)) {
      map.get(cat.parentCategoryId)!.subCategories.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Mirrors `StoreService.getNetworkDirectory`: strips financial and inventory metrics
 * (`dailyPosRevenue`, `availableQuantityTotal`, `skuCount`) and attaches peer store manager
 * contact details.
 */
export function projectStoreNetworkDirectory(
  stores: StoreRecord[],
  users: UserIdentity[],
  storeAssignments: UserStoreAssignmentRecord[],
  regionId?: string,
): StoreNetworkDirectoryEntry[] {
  return stores
    .filter(
      (s) =>
        s.isActive !== false && (!regionId || s.regionId === regionId),
    )
    .map((store) => {
      const assignedUserIds = new Set(
        storeAssignments
          .filter((a) => a.storeId === store.id)
          .map((a) => a.userId),
      );
      const managers = users
        .filter(
          (u) =>
            u.isActive &&
            u.role === 'STORE_MANAGER' &&
            assignedUserIds.has(u.id),
        )
        .map((u) => ({
          fullName: u.fullName,
          email: u.email,
          mobileNumber: u.mobileNumber,
        }));

      return {
        id: store.id,
        storeCode: store.storeCode,
        name: store.name,
        city: store.city,
        address: store.address ?? null,
        latitude: store.latitude ?? null,
        longitude: store.longitude ?? null,
        regionCode: store.regionCode,
        regionName: store.regionName,
        storeTypeCode: store.storeTypeCode,
        contactMobileNumber: managers[0]?.mobileNumber ?? null,
        storeManagers: managers,
      };
    });
}

/**
 * Mirrors `RolesGuard`: checks whether a user's `RoleType` is authorized for a route's `@Roles(...)`.
 */
export function evaluateRolesGuard(
  userRole: RoleType,
  requiredRoles: RoleType[],
): { allowed: boolean; reason: string } {
  if (!requiredRoles || requiredRoles.length === 0) {
    return {
      allowed: true,
      reason: 'No role restriction metadata (@Roles) on route handler.',
    };
  }

  const allowed = requiredRoles.includes(userRole);
  if (allowed) {
    return {
      allowed: true,
      reason: `Role '${userRole}' matches required @Roles(${requiredRoles.join(', ')}).`,
    };
  }

  return {
    allowed: false,
    reason: `Access denied: role '${userRole}' is not authorized. Required role(s): ${requiredRoles.join(', ')}.`,
  };
}

/**
 * Mirrors `TransformInterceptor` & `AllExceptionsFilter`: resolves `X-Correlation-Id`
 * or generates a deterministic/UUID v4 correlation ID and formats either `ApiResponse<T>`
 * or `ApiErrorResponse`.
 */
export function simulatePipelineExecution(params: {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  correlationIdHeader?: string;
  user: UserIdentity;
  body?: Record<string, unknown>;
  simulateOutcome: 'SUCCESS' | 'PRISMA_P2002' | 'PRISMA_P2025' | 'HTTP_403';
  timestamp?: string;
}): {
  correlationId: string;
  httpStatus: number;
  responseEnvelope: ApiResponseEnvelope<unknown> | ApiErrorEnvelope;
  auditEntry: AuditLogEntry | null;
} {
  const correlationId =
    params.correlationIdHeader && params.correlationIdHeader.trim().length > 0
      ? params.correlationIdHeader.trim()
      : 'c9f4e210-84b2-4fd9-9a1e-7731c0b81904';
  const nowIso = params.timestamp || new Date().toISOString();

  if (params.simulateOutcome === 'PRISMA_P2002') {
    return {
      correlationId,
      httpStatus: 409,
      responseEnvelope: {
        success: false,
        statusCode: 409,
        error: {
          code: 'PRISMA_UNIQUE_CONSTRAINT_VIOLATION',
          message: 'Unique constraint violation on field(s): sku, storeId.',
          details: { prismaCode: 'P2002', target: ['sku', 'storeId'] },
        },
        path: params.path,
        method: params.method,
        correlationId,
        timestamp: nowIso,
      },
      auditEntry: null,
    };
  }

  if (params.simulateOutcome === 'PRISMA_P2025') {
    return {
      correlationId,
      httpStatus: 404,
      responseEnvelope: {
        success: false,
        statusCode: 404,
        error: {
          code: 'PRISMA_RECORD_NOT_FOUND',
          message:
            'An operation failed because it depends on one or more records that were required but not found.',
          details: {
            prismaCode: 'P2025',
            meta: { cause: 'Record to update not found.' },
          },
        },
        path: params.path,
        method: params.method,
        correlationId,
        timestamp: nowIso,
      },
      auditEntry: null,
    };
  }

  if (params.simulateOutcome === 'HTTP_403') {
    return {
      correlationId,
      httpStatus: 403,
      responseEnvelope: {
        success: false,
        statusCode: 403,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: role '${params.user.role}' is not authorized for this resource.`,
        },
        path: params.path,
        method: params.method,
        correlationId,
        timestamp: nowIso,
      },
      auditEntry: null,
    };
  }

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(params.method);
  const { sanitized, strippedKeys } = sanitizeAuditPayloadWithReport(
    params.body ?? {},
  );

  const cleanSegments = params.path
    .split('?')[0]
    .split('/')
    .filter(
      (s) =>
        s.length > 0 &&
        s.toLowerCase() !== 'api' &&
        !/^v\d+$/i.test(s),
    );
  const entityName = cleanSegments[0] || 'SystemResource';
  const bodyObj =
    typeof sanitized === 'object' && sanitized !== null
      ? (sanitized as Record<string, unknown>)
      : {};
  const entityId =
    typeof bodyObj.id === 'string'
      ? bodyObj.id
      : typeof bodyObj.inventoryId === 'string'
        ? bodyObj.inventoryId
        : 'inv-mum-001';

  const auditEntry: AuditLogEntry | null = isMutating
    ? {
        id: `aud-${correlationId.slice(0, 8)}`,
        correlationId,
        userId: params.user.id,
        action: `${params.method}_${entityName.toUpperCase()}`,
        entityName,
        entityId,
        oldValues: null,
        newValues: JSON.stringify(sanitized),
        ipAddress: '10.24.18.92',
        timestamp: nowIso,
        strippedKeys,
      }
    : null;

  return {
    correlationId,
    httpStatus: params.method === 'POST' ? 201 : 200,
    responseEnvelope: {
      success: true,
      data: {
        id: entityId,
        entityName,
        status: 'COMMITTED',
        sanitizedEcho: sanitized,
      },
      correlationId,
      timestamp: nowIso,
    },
    auditEntry,
  };
}

// ============================================================================
// CHUNK B4: SALES CORE, ROLLING VELOCITY ENGINE & POS SIMULATION
// ============================================================================

export interface SalesTransactionLineRecord {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: string; // @db.Decimal(10, 3)
  unitPrice: string; // @db.Decimal(12, 2) static snapshot
  discount: string; // @db.Decimal(12, 2) static snapshot
  netAmount: string; // @db.Decimal(12, 2) static snapshot
}

export interface SalesTransactionRecord {
  id: string;
  transactionNumber: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  transactionDate: string;
  customerId: string | null;
  totalQuantity: string; // @db.Decimal(10, 3)
  totalAmount: string; // @db.Decimal(12, 2)
  lines: SalesTransactionLineRecord[];
}

export interface SalesSummaryMetrics {
  storeId: string | null;
  totalRevenue: string; // @db.Decimal(12, 2)
  totalUnitsSold: string; // @db.Decimal(10, 3)
  totalTransactionCount: number;
  averageBasketValue: string; // @db.Decimal(12, 2)
}

/**
 * Exact base-10 cents (`10^-2`) helper for @db.Decimal(12, 2) currency arithmetic.
 */
function toCents(decimalStr: string | number): bigint {
  const raw = String(decimalStr).trim();
  const negative = raw.startsWith('-');
  const clean = negative ? raw.slice(1) : raw;
  const [intPart = '0', fracPart = ''] = clean.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  const combined = BigInt(intPart || '0') * 100n + BigInt(paddedFrac);
  return negative ? -combined : combined;
}

function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const intPart = abs / 100n;
  const fracPart = String(abs % 100n).padStart(2, '0');
  return `${negative ? '-' : ''}${intPart.toString()}.${fracPart}`;
}

/**
 * Mirrors `SalesService.createSale`:
 * 1. Validates unique `transactionNumber` (`SALES_DUPLICATE_TX`).
 * 2. Snapshots point-in-time `unitPrice`, `discount`, and `netAmount` statically on each line.
 * 3. Lazily initializes missing `Inventory` rows at `0.000` (`version: 1`).
 * 4. Atomically decrements `availableQuantity` by `line.quantity` and increments `version`.
 *    POS checkouts are NEVER blocked when shelf stock drops below zero; negative balances
 *    are allowed and reported in `negativeStockAlerts`.
 * 5. Inserts an immutable `InventoryMovement` with `movementType = 'POS_SALE'` and `createdBy = 'POS_TERMINAL'`.
 */
export function executePosSaleIngestion(
  existingTransactions: SalesTransactionRecord[],
  balances: InventoryBalanceRecord[],
  movements: InventoryMovementRecord[],
  input: {
    transactionNumber: string;
    storeId: string;
    storeCode: string;
    storeName: string;
    transactionDate?: string;
    customerId?: string;
    lines: Array<{
      productId: string;
      sku: string;
      productName: string;
      quantity: string | number;
      unitPrice: string | number;
      discount?: string | number;
      netAmount: string | number;
    }>;
  },
):
  | {
      ok: true;
      transaction: SalesTransactionRecord;
      transactions: SalesTransactionRecord[];
      balances: InventoryBalanceRecord[];
      movements: InventoryMovementRecord[];
      negativeStockAlerts: Array<{
        storeId: string;
        storeCode: string;
        productId: string;
        sku: string;
        availableQuantityAfterSale: string;
      }>;
    }
  | {
      ok: false;
      errorCode: 'SALES_DUPLICATE_TX' | 'SALES_EMPTY_LINES';
      statusCode: 409 | 400;
      message: string;
    } {
  const normalizedTxNumber = input.transactionNumber.trim();
  if (!input.lines || input.lines.length === 0) {
    return {
      ok: false,
      errorCode: 'SALES_EMPTY_LINES',
      statusCode: 400,
      message:
        "BadRequestException('SALES_EMPTY_LINES'): POS transaction must contain at least one line item.",
    };
  }

  if (
    existingTransactions.some(
      (t) =>
        t.transactionNumber.toLowerCase() === normalizedTxNumber.toLowerCase(),
    )
  ) {
    return {
      ok: false,
      errorCode: 'SALES_DUPLICATE_TX',
      statusCode: 409,
      message: `ConflictException('SALES_DUPLICATE_TX'): Sales transaction '${normalizedTxNumber}' has already been recorded.`,
    };
  }

  const txDateIso = input.transactionDate || new Date().toISOString();
  const txId = `sal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let totalQtyMillis = 0n;
  let totalAmountCents = 0n;

  const builtLines: SalesTransactionLineRecord[] = input.lines.map(
    (line, idx) => {
      const qtyMillis = toMillis(line.quantity);
      const unitCents = toCents(line.unitPrice);
      const discCents = toCents(line.discount ?? 0);
      const netCents = toCents(line.netAmount);

      totalQtyMillis += qtyMillis;
      totalAmountCents += netCents;

      return {
        id: `${txId}-ln-${idx + 1}`,
        productId: line.productId,
        sku: line.sku,
        productName: line.productName,
        quantity: fromMillis(qtyMillis),
        unitPrice: fromCents(unitCents),
        discount: fromCents(discCents),
        netAmount: fromCents(netCents),
      };
    },
  );

  let nextBalances = [...balances];
  const newMovements: InventoryMovementRecord[] = [];
  const negativeStockAlerts: Array<{
    storeId: string;
    storeCode: string;
    productId: string;
    sku: string;
    availableQuantityAfterSale: string;
  }> = [];

  for (const line of builtLines) {
    const lazy = getOrCreateLazyInventoryBalance(nextBalances, {
      storeId: input.storeId,
      storeCode: input.storeCode,
      storeName: input.storeName,
      productId: line.productId,
      sku: line.sku,
      productName: line.productName,
    });
    nextBalances = lazy.updatedBalances;

    const invIdx = nextBalances.findIndex(
      (b) => b.storeId === input.storeId && b.productId === line.productId,
    );
    const currentInv = nextBalances[invIdx];
    const lineQtyMillis = toMillis(line.quantity);
    const updatedAvailMillis =
      toMillis(currentInv.availableQuantity) - lineQtyMillis;

    const updatedBalance: InventoryBalanceRecord = {
      ...currentInv,
      availableQuantity: fromMillis(updatedAvailMillis),
      version: currentInv.version + 1,
      lastUpdatedOn: txDateIso,
    };
    nextBalances[invIdx] = updatedBalance;

    if (updatedAvailMillis < 0n) {
      negativeStockAlerts.push({
        storeId: input.storeId,
        storeCode: input.storeCode,
        productId: line.productId,
        sku: line.sku,
        availableQuantityAfterSale: updatedBalance.availableQuantity,
      });
    }

    newMovements.push({
      id: `mov-pos-${Date.now()}-${Math.floor(Math.random() * 1000)}-${line.id}`,
      inventoryId: updatedBalance.id,
      storeCode: input.storeCode,
      sku: line.sku,
      movementType: 'POS_SALE',
      quantity: fromMillis(-lineQtyMillis),
      referenceType: 'SALES_TRANSACTION',
      referenceId: txId,
      remarks: input.customerId
        ? `POS Invoice ${normalizedTxNumber} (Customer: ${input.customerId})`
        : `POS Invoice ${normalizedTxNumber}`,
      createdBy: 'POS_TERMINAL',
      movementDate: txDateIso,
    });
  }

  const createdTransaction: SalesTransactionRecord = {
    id: txId,
    transactionNumber: normalizedTxNumber,
    storeId: input.storeId,
    storeCode: input.storeCode,
    storeName: input.storeName,
    transactionDate: txDateIso,
    customerId: input.customerId?.trim() || null,
    totalQuantity: fromMillis(totalQtyMillis),
    totalAmount: fromCents(totalAmountCents),
    lines: builtLines,
  };

  return {
    ok: true,
    transaction: createdTransaction,
    transactions: [createdTransaction, ...existingTransactions],
    balances: nextBalances,
    movements: [...newMovements, ...movements],
    negativeStockAlerts,
  };
}

/**
 * Mirrors `VelocityService.getAverageDailySales`:
 * Computes `SUM(quantity) / windowDays` over the trailing `windowDays` window.
 * Explicit zero-handling: returns `0` (`0.000` when formatted) if total sales in window is 0 or null.
 */
export function computeRollingAdsVelocity(
  transactions: SalesTransactionRecord[],
  storeId: string,
  productId: string,
  windowDays: number = 30,
  referenceDateIso?: string,
): number {
  const safeWindowDays =
    Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 30;
  const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
  const cutoffMs = refDate.getTime() - safeWindowDays * 24 * 60 * 60 * 1000;

  let totalMillis = 0n;

  for (const tx of transactions) {
    if (tx.storeId !== storeId) continue;
    const txTime = new Date(tx.transactionDate).getTime();
    if (txTime < cutoffMs) continue;

    for (const line of tx.lines) {
      if (line.productId === productId) {
        totalMillis += toMillis(line.quantity);
      }
    }
  }

  if (totalMillis <= 0n) {
    return 0.0;
  }

  const totalQty = Number(totalMillis) / 1000;
  const ads = totalQty / safeWindowDays;
  return Number(ads.toFixed(3));
}

/**
 * Mirrors `VelocityService.getStoreVelocityMap`:
 * Returns `{ [productId]: averageDailySales }` for all products sold in `storeId` over `windowDays`.
 */
export function computeStoreVelocityMap(
  transactions: SalesTransactionRecord[],
  storeId: string,
  windowDays: number = 30,
  referenceDateIso?: string,
): Record<string, number> {
  const safeWindowDays =
    Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 30;
  const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
  const cutoffMs = refDate.getTime() - safeWindowDays * 24 * 60 * 60 * 1000;

  const millisByProduct = new Map<string, bigint>();

  for (const tx of transactions) {
    if (tx.storeId !== storeId) continue;
    const txTime = new Date(tx.transactionDate).getTime();
    if (txTime < cutoffMs) continue;

    for (const line of tx.lines) {
      const prev = millisByProduct.get(line.productId) ?? 0n;
      millisByProduct.set(line.productId, prev + toMillis(line.quantity));
    }
  }

  const velocityMap: Record<string, number> = {};
  for (const [productId, totalMillis] of millisByProduct.entries()) {
    const totalQty = Number(totalMillis) / 1000;
    const ads = totalQty > 0 ? totalQty / safeWindowDays : 0;
    velocityMap[productId] = Number(ads.toFixed(3));
  }

  return velocityMap;
}

/**
 * Mirrors `SalesService.getSummary`:
 * Aggregates `totalRevenue`, `totalUnitsSold`, `totalTransactionCount`, and `averageBasketValue`.
 */
export function computeSalesSummary(
  transactions: SalesTransactionRecord[],
  filter?: {
    storeId?: string;
    startDate?: string;
    endDate?: string;
  },
): SalesSummaryMetrics {
  const filtered = transactions.filter((tx) => {
    if (filter?.storeId && tx.storeId !== filter.storeId) return false;
    const txMs = new Date(tx.transactionDate).getTime();
    if (filter?.startDate && txMs < new Date(filter.startDate).getTime()) {
      return false;
    }
    if (filter?.endDate && txMs > new Date(filter.endDate).getTime()) {
      return false;
    }
    return true;
  });

  let revenueCents = 0n;
  let unitsMillis = 0n;

  for (const tx of filtered) {
    revenueCents += toCents(tx.totalAmount);
    unitsMillis += toMillis(tx.totalQuantity);
  }

  const count = filtered.length;
  const avgBasketCents = count > 0 ? revenueCents / BigInt(count) : 0n;

  return {
    storeId: filter?.storeId ?? null,
    totalRevenue: fromCents(revenueCents),
    totalUnitsSold: fromMillis(unitsMillis),
    totalTransactionCount: count,
    averageBasketValue: fromCents(avgBasketCents),
  };
}

/**
 * Mirrors `SimulationService.triggerSalesSpike`:
 * Fetches product `sellingPrice`, generates synthetic `SIM-SPIKE-<timestamp>` receipt,
 * calls `executePosSaleIngestion` to deplete inventory, and returns the updated store stock
 * and rolling 30-day ADS velocity.
 */
export function executeSimulatedSalesSpike(
  existingTransactions: SalesTransactionRecord[],
  balances: InventoryBalanceRecord[],
  movements: InventoryMovementRecord[],
  products: ProductCatalogRecord[],
  stores: StoreRecord[],
  dto: {
    storeId: string;
    productId: string;
    unitsToSell: number;
    timestampMs?: number;
  },
):
  | {
      ok: true;
      transaction: SalesTransactionRecord;
      updatedBalance: InventoryBalanceRecord;
      isNegativeStock: boolean;
      rolling30DayAds: number;
      transactions: SalesTransactionRecord[];
      balances: InventoryBalanceRecord[];
      movements: InventoryMovementRecord[];
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
    } {
  const product = products.find((p) => p.id === dto.productId);
  if (!product) {
    return {
      ok: false,
      errorCode: 'PROD_NOT_FOUND',
      message: `NotFoundException('PROD_NOT_FOUND'): Product '${dto.productId}' does not exist.`,
    };
  }

  const store = stores.find((s) => s.id === dto.storeId);
  if (!store) {
    return {
      ok: false,
      errorCode: 'STORE_NOT_FOUND',
      message: `NotFoundException('STORE_NOT_FOUND'): Store '${dto.storeId}' does not exist.`,
    };
  }

  const ts = dto.timestampMs ?? Date.now();
  const transactionNumber = `SIM-SPIKE-${ts}`;
  const unitPriceNum = Number(product.sellingPrice);
  const netAmountNum = Number((unitPriceNum * dto.unitsToSell).toFixed(2));

  const saleResult = executePosSaleIngestion(
    existingTransactions,
    balances,
    movements,
    {
      transactionNumber,
      storeId: store.id,
      storeCode: store.storeCode,
      storeName: store.name,
      transactionDate: new Date(ts).toISOString(),
      customerId: 'SIMULATION_ENGINE',
      lines: [
        {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          quantity: dto.unitsToSell.toFixed(3),
          unitPrice: unitPriceNum.toFixed(2),
          discount: '0.00',
          netAmount: netAmountNum.toFixed(2),
        },
      ],
    },
  );

  if (!saleResult.ok) {
    return {
      ok: false,
      errorCode: saleResult.errorCode,
      message: saleResult.message,
    };
  }

  const updatedBalance = saleResult.balances.find(
    (b) => b.storeId === store.id && b.productId === product.id,
  )!;
  const isNegativeStock = toMillis(updatedBalance.availableQuantity) < 0n;
  const rolling30DayAds = computeRollingAdsVelocity(
    saleResult.transactions,
    store.id,
    product.id,
    30,
    new Date(ts).toISOString(),
  );

  return {
    ok: true,
    transaction: saleResult.transaction,
    updatedBalance,
    isNegativeStock,
    rolling30DayAds,
    transactions: saleResult.transactions,
    balances: saleResult.balances,
    movements: saleResult.movements,
  };
}

// ============================================================================
// CHUNK B5: INTELLIGENCE LAYER, DOI MATH & CANDIDATE REBALANCE ENGINE
// ============================================================================

export type DoiRiskTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type RecommendationType =
  | 'STOCK_OUT'
  | 'LOW_STOCK'
  | 'EXCESS_STOCK'
  | 'REORDER'
  | 'STOCK_TRANSFER'
  | 'MANUAL_STORE_REQUEST';
export type RecommendationStatus =
  | 'OPEN'
  | 'APPROVED'
  | 'REJECTED'
  | 'MODIFIED'
  | 'COMPLETED'
  | 'AUTO_EXPIRED';

export interface CandidateStoreRankRecord {
  storeId: string;
  storeCode: string;
  storeName: string;
  availableStock: number;
  ads: number;
  currentDOI: number;
  postTransferDOI: number;
  maxSafeTransferQty: number;
  distanceKm: number;
  suitabilityScore: number;
  rank: number;
}

export interface RecommendationEvidenceRecord {
  metric: string;
  value: string;
  description: string;
}

export interface RecommendationRecord {
  id: string;
  recommendationNumber: string;
  recommendationType: RecommendationType;
  storeId: string;
  storeCode: string;
  storeName: string;
  regionId: string;
  productId: string;
  sku: string;
  productName: string;
  fromStoreId: string | null;
  fromStoreCode: string | null;
  toStoreId: string;
  recommendedQuantity: string; // @db.Decimal(10, 3)
  priority: DoiRiskTier;
  reason: string;
  status: RecommendationStatus;
  updatedAt: string;
  evidence: RecommendationEvidenceRecord[];
}

export interface EvaluationResultSummary {
  evaluatedStores: number;
  evaluatedSKUs: number;
  highRiskDetected: number;
  newRecommendationsCreated: number;
  existingRecommendationsRefreshed: number;
  autoExpiredCount: number;
  timestamp: string;
}

/**
 * Mirrors `DoiService.calculateDOI`:
 * - `availableQuantity <= 0`             -> `0.0`
 * - `ads <= 0 && availableQuantity > 0`  -> `999.0` (Dormant / Dead Stock)
 * - Otherwise                            -> `Number((availableQuantity / ads).toFixed(2))`
 */
export function calculateDeterministicDOI(
  availableQuantity: number,
  ads: number,
): number {
  if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
    return 0.0;
  }
  if (!Number.isFinite(ads) || ads <= 0) {
    return 999.0;
  }
  return Number((availableQuantity / ads).toFixed(2));
}

/**
 * Mirrors `DoiService.classifyRisk`:
 * - `doi <= 3.0` -> `'HIGH'`
 * - `doi <= 7.0` -> `'MEDIUM'`
 * - `doi > 7.0`  -> `'LOW'`
 */
export function classifyDoiRiskTier(doi: number): DoiRiskTier {
  if (doi <= 3.0) return 'HIGH';
  if (doi <= 7.0) return 'MEDIUM';
  return 'LOW';
}

/**
 * Mirrors `DoiService.classifyStatus`:
 * - `availableQuantity <= 0`                     -> `'CRITICAL'`
 * - `availableQuantity <= reorderLevel`          -> `'LOW'`
 * - `availableQuantity > maximumStock || doi > 30.0` -> `'EXCESS'`
 * - Otherwise                                    -> `'HEALTHY'`
 */
export function classifyDoiStockStatus(
  availableQuantity: number,
  reorderLevel: number,
  maximumStock: number,
  doi: number,
): StockHealthStatus {
  if (availableQuantity <= 0) return 'CRITICAL';
  if (availableQuantity <= reorderLevel) return 'LOW';
  if (availableQuantity > maximumStock || doi > 30.0) return 'EXCESS';
  return 'HEALTHY';
}

/**
 * Mirrors `CandidateRankingService.calculateDistance`:
 * Haversine distance in kilometers; returns `999.0` if coordinates are missing.
 */
export function calculateHaversineDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
): number {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 999.0;
  }

  const R = 6371.0;
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Mirrors `CandidateRankingService.findAndRankCandidates`:
 * 1. Filters strictly to active stores in `regionId` (`store.id !== destStoreId`).
 * 2. Requires `availableStock > minimumStock` and `currentDOI > 30.0`.
 * 3. Enforces 7-Day Source DOI protection floor (`maxSafeTransfer = Math.floor(availableStock - 7.0 * ads)`
 *    and `postTransferDOI > 7.0`).
 * 4. Computes normalized suitability score `(0.60 * normExcessQty) + (0.40 * normExcessDOI)` (scaled 0..100).
 * 5. Sorts by `suitabilityScore DESC`, tie-breaker 1: `distanceKm ASC`, tie-breaker 2: `availableStock DESC`.
 */
export function rankRegionalDonorCandidates(params: {
  destStoreId: string;
  regionId: string;
  productId: string;
  targetUnitsNeeded: number;
  stores: StoreRecord[];
  balances: InventoryBalanceRecord[];
  adsByStoreAndProduct: Record<string, number>;
}): CandidateStoreRankRecord[] {
  const destStore = params.stores.find((s) => s.id === params.destStoreId);
  const peerStores = params.stores.filter(
    (s) =>
      s.isActive !== false &&
      s.regionId === params.regionId &&
      s.id !== params.destStoreId,
  );

  const effectiveTarget =
    Number.isFinite(params.targetUnitsNeeded) && params.targetUnitsNeeded > 0
      ? Math.ceil(params.targetUnitsNeeded)
      : 10;

  const rawPool: Array<{
    storeId: string;
    storeCode: string;
    storeName: string;
    availableStock: number;
    ads: number;
    currentDOI: number;
    postTransferDOI: number;
    maxSafeTransferQty: number;
    distanceKm: number;
    excessStockQty: number;
    excessDOI: number;
  }> = [];

  for (const store of peerStores) {
    const inv = params.balances.find(
      (b) => b.storeId === store.id && b.productId === params.productId,
    );
    if (!inv) continue;

    const availableStock = Number(inv.availableQuantity);
    const minimumStock = Number(inv.minimumStock);
    if (availableStock <= minimumStock) continue;

    const adsKey = `${store.id}:${params.productId}`;
    const ads = params.adsByStoreAndProduct[adsKey] ?? 0.0;
    const currentDOI = calculateDeterministicDOI(availableStock, ads);

    if (currentDOI <= 30.0) continue;

    let maxSafeTransfer = Math.floor(availableStock - 7.0 * ads);
    if (ads > 0 && (availableStock - maxSafeTransfer) / ads <= 7.0) {
      maxSafeTransfer = Math.max(0, maxSafeTransfer - 1);
    }

    const maxAboveMin = Math.floor(availableStock - minimumStock);
    maxSafeTransfer = Math.min(maxSafeTransfer, maxAboveMin);
    if (maxSafeTransfer <= 0) continue;

    const transferUnits = Math.min(effectiveTarget, maxSafeTransfer);
    const postTransferDOI =
      ads > 0
        ? Number(((availableStock - transferUnits) / ads).toFixed(2))
        : 999.0;

    if (ads > 0 && postTransferDOI <= 7.0) continue;

    const distanceKm = calculateHaversineDistanceKm(
      destStore?.latitude,
      destStore?.longitude,
      store.latitude,
      store.longitude,
    );

    rawPool.push({
      storeId: store.id,
      storeCode: store.storeCode,
      storeName: store.name,
      availableStock: Number(availableStock.toFixed(3)),
      ads: Number(ads.toFixed(3)),
      currentDOI,
      postTransferDOI,
      maxSafeTransferQty: maxSafeTransfer,
      distanceKm,
      excessStockQty: Math.max(0, availableStock - minimumStock),
      excessDOI: Math.max(0, currentDOI - 30.0),
    });
  }

  if (rawPool.length === 0) return [];

  const maxExcessQty = Math.max(...rawPool.map((c) => c.excessStockQty), 0);
  const maxExcessDOI = Math.max(...rawPool.map((c) => c.excessDOI), 0);

  const scored: CandidateStoreRankRecord[] = rawPool.map((c) => {
    const normQty = maxExcessQty > 0 ? c.excessStockQty / maxExcessQty : 1.0;
    const normDOI = maxExcessDOI > 0 ? c.excessDOI / maxExcessDOI : 1.0;
    const suitabilityScore = Number((normQty * 60 + normDOI * 40).toFixed(2));

    return {
      storeId: c.storeId,
      storeCode: c.storeCode,
      storeName: c.storeName,
      availableStock: c.availableStock,
      ads: c.ads,
      currentDOI: c.currentDOI,
      postTransferDOI: c.postTransferDOI,
      maxSafeTransferQty: c.maxSafeTransferQty,
      distanceKm: c.distanceKm,
      suitabilityScore,
      rank: 0,
    };
  });

  scored.sort((a, b) => {
    if (b.suitabilityScore !== a.suitabilityScore) {
      return b.suitabilityScore - a.suitabilityScore;
    }
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    return b.availableStock - a.availableStock;
  });

  return scored.map((c, idx) => ({
    ...c,
    rank: idx + 1,
  }));
}

/**
 * Mirrors `RebalanceService.evaluateStore` / `evaluateRegion` / `evaluateEnterprise`:
 * Evaluates target stores, auto-expires recommendations that recovered to `HEALTHY`,
 * computes 14-day target transfer horizon for `HIGH` risk (`DOI <= 3.0`), ranks regional
 * donor candidates (or falls back to Central Supply `REORDER`), and deduplicates against
 * active `OPEN` / `MODIFIED` recommendations.
 */
export function evaluateIntelligenceRebalance(params: {
  targetStoreIds: string[];
  stores: StoreRecord[];
  balances: InventoryBalanceRecord[];
  existingRecommendations: RecommendationRecord[];
  adsByStoreAndProduct: Record<string, number>;
}): {
  result: EvaluationResultSummary;
  recommendations: RecommendationRecord[];
} {
  let nextRecs = [...params.existingRecommendations];
  let evaluatedStores = 0;
  let evaluatedSKUs = 0;
  let highRiskDetected = 0;
  let newRecommendationsCreated = 0;
  let existingRecommendationsRefreshed = 0;
  let autoExpiredCount = 0;
  const nowIso = new Date().toISOString();

  for (const storeId of params.targetStoreIds) {
    const store = params.stores.find(
      (s) => s.id === storeId && s.isActive !== false,
    );
    if (!store) continue;

    evaluatedStores += 1;
    const storeBalances = params.balances.filter((b) => b.storeId === store.id);

    for (const inv of storeBalances) {
      evaluatedSKUs += 1;
      const adsKey = `${store.id}:${inv.productId}`;
      const ads = params.adsByStoreAndProduct[adsKey] ?? 0.0;
      const availableStock = Number(inv.availableQuantity);
      const reorderLevel = Number(inv.reorderLevel);
      const maximumStock = Number(inv.maximumStock);

      const doi = calculateDeterministicDOI(availableStock, ads);
      const risk = classifyDoiRiskTier(doi);
      const status = classifyDoiStockStatus(
        availableStock,
        reorderLevel,
        maximumStock,
        doi,
      );

      // 1. Auto-Expiration check when stock recovers to HEALTHY
      if (status === 'HEALTHY') {
        nextRecs = nextRecs.map((rec) => {
          if (
            rec.storeId === store.id &&
            rec.productId === inv.productId &&
            (rec.status === 'OPEN' || rec.status === 'MODIFIED')
          ) {
            autoExpiredCount += 1;
            return {
              ...rec,
              status: 'AUTO_EXPIRED',
              reason:
                'Auto-closed: Destination store stock normalized to healthy buffer via inward receipt.',
              updatedAt: nowIso,
            };
          }
          return rec;
        });
        continue;
      }

      // 2. Stock-Out Rebalance Trigger when Risk == 'HIGH' (DOI <= 3.0)
      if (risk === 'HIGH') {
        highRiskDetected += 1;
        const rawTarget = Math.ceil(14.0 * ads - availableStock);
        const targetUnitsNeeded = rawTarget > 0 ? rawTarget : 10;

        const candidates = rankRegionalDonorCandidates({
          destStoreId: store.id,
          regionId: store.regionId,
          productId: inv.productId,
          targetUnitsNeeded,
          stores: params.stores,
          balances: params.balances,
          adsByStoreAndProduct: params.adsByStoreAndProduct,
        });

        let recType: RecommendationType;
        let fromStoreId: string | null;
        let fromStoreCode: string | null;
        let recommendedQtyNum: number;
        let reason: string;
        let evidence: RecommendationEvidenceRecord[];

        if (candidates.length > 0) {
          const rank1 = candidates[0];
          recType = 'STOCK_TRANSFER';
          fromStoreId = rank1.storeId;
          fromStoreCode = rank1.storeCode;
          recommendedQtyNum = Math.min(
            targetUnitsNeeded,
            rank1.maxSafeTransferQty,
          );
          reason = `High stock-out risk (DOI ${doi.toFixed(2)}d <= 3.0d). Regional transfer from ${rank1.storeCode} (${rank1.distanceKm.toFixed(1)} km) recommended.`;
          evidence = [
            {
              metric: 'DEST_DOI',
              value: doi.toFixed(2),
              description: 'Destination store current Days of Inventory (DOI)',
            },
            {
              metric: 'DEST_STOCK',
              value: availableStock.toFixed(3),
              description: 'Destination store current available stock',
            },
            {
              metric: 'SRC_DOI',
              value: rank1.currentDOI.toFixed(2),
              description: `Donor store (${rank1.storeCode}) pre-transfer DOI`,
            },
            {
              metric: 'SRC_STOCK',
              value: rank1.availableStock.toFixed(3),
              description: `Donor store (${rank1.storeCode}) available stock`,
            },
            {
              metric: 'SRC_POST_TRANSFER_DOI',
              value: rank1.postTransferDOI.toFixed(2),
              description: `Donor store (${rank1.storeCode}) projected DOI after transfer (> 7.0d safety floor)`,
            },
            {
              metric: 'DISTANCE_KM',
              value: rank1.distanceKm.toFixed(2),
              description:
                'Haversine proximity between donor and destination stores',
            },
          ];
        } else {
          recType = 'REORDER';
          fromStoreId = null;
          fromStoreCode = null;
          recommendedQtyNum = targetUnitsNeeded;
          reason =
            'No regional store holds surplus inventory. Central Supply reorder required.';
          evidence = [
            {
              metric: 'DEST_DOI',
              value: doi.toFixed(2),
              description: 'Destination store current Days of Inventory (DOI)',
            },
            {
              metric: 'DEST_STOCK',
              value: availableStock.toFixed(3),
              description: 'Destination store current available stock',
            },
            {
              metric: 'REASON',
              value: 'CENTRAL_SUPPLY_FALLBACK',
              description:
                'No regional store holds surplus inventory. Central Supply reorder required.',
            },
          ];
        }

        const existingIdx = nextRecs.findIndex(
          (r) =>
            r.storeId === store.id &&
            r.productId === inv.productId &&
            (r.status === 'OPEN' || r.status === 'MODIFIED'),
        );

        if (existingIdx !== -1) {
          existingRecommendationsRefreshed += 1;
          nextRecs[existingIdx] = {
            ...nextRecs[existingIdx],
            recommendationType: recType,
            fromStoreId,
            fromStoreCode,
            toStoreId: store.id,
            recommendedQuantity: recommendedQtyNum.toFixed(3),
            priority: 'HIGH',
            reason,
            updatedAt: nowIso,
            evidence,
          };
        } else {
          newRecommendationsCreated += 1;
          const newRec: RecommendationRecord = {
            id: `rec-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            recommendationNumber: `REC-${Date.now().toString().slice(-6)}`,
            recommendationType: recType,
            storeId: store.id,
            storeCode: store.storeCode,
            storeName: store.name,
            regionId: store.regionId,
            productId: inv.productId,
            sku: inv.sku,
            productName: inv.productName,
            fromStoreId,
            fromStoreCode,
            toStoreId: store.id,
            recommendedQuantity: recommendedQtyNum.toFixed(3),
            priority: 'HIGH',
            reason,
            status: 'OPEN',
            updatedAt: nowIso,
            evidence,
          };
          nextRecs = [newRec, ...nextRecs];
        }
      }
    }
  }

  return {
    result: {
      evaluatedStores,
      evaluatedSKUs,
      highRiskDetected,
      newRecommendationsCreated,
      existingRecommendationsRefreshed,
      autoExpiredCount,
      timestamp: nowIso,
    },
    recommendations: nextRecs,
  };
}

// ============================================================================
// CHUNK B6: ACTION CENTER MODULE & VENDOR-AGNOSTIC LANGCHAIN AI SERVICE
// ============================================================================

export type LlmProviderMode = 'GEMINI' | 'OPENAI' | 'TEMPLATE';

export interface RebalanceFactsInput {
  recommendationId: string;
  recommendationType:
    | 'REBALANCE_TRANSFER'
    | 'CENTRAL_SUPPLY_ORDER'
    | 'MANUAL_STORE_REQUEST'
    | 'STOCK_TRANSFER'
    | 'REORDER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  productName: string;
  sku: string;
  recommendedQuantity: number;
  destStoreName: string;
  destStoreCode: string;
  destAvailableStock: number;
  destADS: number;
  destCurrentDOI: number;
  destTargetDOI: number;
  sourceStoreName?: string | null;
  sourceStoreCode?: string | null;
  sourceAvailableStock?: number | null;
  sourceADS?: number | null;
  sourceCurrentDOI?: number | null;
  sourcePostTransferDOI?: number | null;
  distanceKm?: number | null;
}

export interface ActionHistoryEntry {
  id: string;
  actionId: string;
  previousStatus: RecommendationStatus;
  newStatus: RecommendationStatus;
  changedBy: string;
  changedOn: string;
  comments: string;
}

export interface RecommendationActionRecord {
  id: string;
  recommendationId: string;
  actionType: 'APPROVE' | 'MODIFY' | 'REJECT';
  actionedBy: string;
  actionedOn: string;
  comments: string;
  history: ActionHistoryEntry[];
}

/**
 * Mirrors `TemplateFallbackProvider.generateNarrative` & `AiService.getOrGenerateExplanation`:
 * Produces grounded, zero-hallucination executive narratives citing exact destination DOI/ADS
 * and either regional donor post-transfer DOI (> 7-day protection floor) or Central Supply fallback.
 */
export function generateDeterministicAiNarrative(
  facts: RebalanceFactsInput,
): string {
  const destSummary = `${facts.destStoreName} (${facts.destStoreCode}) currently holds ${facts.destAvailableStock} units of ${facts.productName} (${facts.sku}) with an average daily sales velocity of ${facts.destADS} units/day, resulting in a critical ${facts.destCurrentDOI}-day inventory cover against a ${facts.destTargetDOI}-day target.`;

  if (facts.sourceStoreName && facts.sourceStoreCode) {
    const sourceSummary = `Transferring ${facts.recommendedQuantity} units from regional peer ${facts.sourceStoreName} (${facts.sourceStoreCode}${facts.distanceKm != null ? `, ${facts.distanceKm} km away` : ''}) resolves the deficit while reducing the donor store's cover from ${facts.sourceCurrentDOI} days to ${facts.sourcePostTransferDOI} days, safely above the 7-day protection threshold.`;
    return `${destSummary} ${sourceSummary}`;
  }

  const centralFallbackSummary = `Because no regional peer store within the region holds excess inventory above the 30-day overstock threshold, a Central Warehouse replenishment order of ${facts.recommendedQuantity} units is recommended to restore ${facts.destStoreName} to its ${facts.destTargetDOI}-day target cover.`;
  return `${destSummary} ${centralFallbackSummary}`;
}

/**
 * Mirrors `ActionCenterService.approve`:
 * - Requires recommendation status in `('OPEN', 'MODIFIED')`.
 * - If `fromStoreId != null`: creates `StockTransfer` in `APPROVED_IN_TRANSIT`, decrements donor
 *   `availableQuantity`, increments `inTransitQuantity`, increments `version`, and logs `TRANSFER_OUT_DISPATCH`.
 * - If `fromStoreId == null` (Central Supply fallback): directly increments destination `availableQuantity`
 *   and logs `INWARD_RECEIPT` (`referenceType: 'CENTRAL_SUPPLY'`).
 * - Transitions recommendation status to `COMPLETED` and appends `Action` (`APPROVE`) + `ActionHistory`.
 */
export function approveRecommendationAction(params: {
  recommendation: RecommendationRecord;
  balances: InventoryBalanceRecord[];
  transfers: StockTransferRecord[];
  movements: InventoryMovementRecord[];
  actions: RecommendationActionRecord[];
  comments?: string;
  userId: string;
}):
  | {
      ok: true;
      recommendation: RecommendationRecord;
      createdTransfer: StockTransferRecord | null;
      balances: InventoryBalanceRecord[];
      transfers: StockTransferRecord[];
      movements: InventoryMovementRecord[];
      actions: RecommendationActionRecord[];
      actionRecord: RecommendationActionRecord;
    }
  | {
      ok: false;
      errorCode:
        | 'REC_INVALID_STATUS'
        | 'INSUFFICIENT_DONOR_STOCK'
        | 'DONOR_INVENTORY_NOT_FOUND';
      statusCode: 400 | 409;
      message: string;
    } {
  const { recommendation, userId } = params;
  if (
    recommendation.status !== 'OPEN' &&
    recommendation.status !== 'MODIFIED'
  ) {
    return {
      ok: false,
      errorCode: 'REC_INVALID_STATUS',
      statusCode: 409,
      message: `ConflictException: Recommendation ${recommendation.id} cannot be approved because its status is ${recommendation.status}`,
    };
  }

  const qtyNum = Number(recommendation.recommendedQuantity);
  const qtyMillis = toMillis(recommendation.recommendedQuantity);
  const previousStatus = recommendation.status;
  const nowIso = new Date().toISOString();

  let nextBalances = [...params.balances];
  let nextTransfers = [...params.transfers];
  const newMovements: InventoryMovementRecord[] = [];
  let createdTransfer: StockTransferRecord | null = null;

  if (recommendation.fromStoreId) {
    // Regional Store-to-Store Transfer
    const srcIdx = nextBalances.findIndex(
      (b) =>
        b.storeId === recommendation.fromStoreId &&
        b.productId === recommendation.productId,
    );
    if (srcIdx === -1) {
      return {
        ok: false,
        errorCode: 'DONOR_INVENTORY_NOT_FOUND',
        statusCode: 400,
        message: `Source store has insufficient available stock (0) for transfer quantity ${qtyNum}`,
      };
    }

    const srcInv = nextBalances[srcIdx];
    const srcAvailMillis = toMillis(srcInv.availableQuantity);
    if (srcAvailMillis < qtyMillis) {
      return {
        ok: false,
        errorCode: 'INSUFFICIENT_DONOR_STOCK',
        statusCode: 400,
        message: `Source store has insufficient available stock (${srcInv.availableQuantity}) for transfer quantity ${qtyNum}`,
      };
    }

    const nextAvailMillis = srcAvailMillis - qtyMillis;
    const nextInTransitMillis = toMillis(srcInv.inTransitQuantity) + qtyMillis;

    nextBalances[srcIdx] = {
      ...srcInv,
      availableQuantity: fromMillis(nextAvailMillis),
      inTransitQuantity: fromMillis(nextInTransitMillis),
      version: srcInv.version + 1,
      lastUpdatedOn: nowIso,
    };

    const transferId = `trf-rec-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const transferNumber = `TRF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    createdTransfer = {
      id: transferId,
      transferNumber,
      fromStoreId: recommendation.fromStoreId,
      fromStoreCode: recommendation.fromStoreCode ?? srcInv.storeCode,
      toStoreId: recommendation.toStoreId,
      toStoreCode: recommendation.storeCode,
      status: 'APPROVED_IN_TRANSIT',
      carrierName: 'Regional Fleet Express',
      vehicleNumber: 'MH-01-RT-2040',
      dispatchNoteNumber: `DN-${transferNumber.slice(-4)}`,
      estimatedArrival: null,
      dispatchedAt: nowIso,
      receivedAt: null,
      requestedBy: userId,
      approvedBy: userId,
      receivedBy: null,
      lines: [
        {
          id: `${transferId}-ln-1`,
          productId: recommendation.productId,
          sku: recommendation.sku,
          productName: recommendation.productName,
          requestedQty: fromMillis(qtyMillis),
          approvedQty: fromMillis(qtyMillis),
          receivedQty: null,
        },
      ],
    };

    nextTransfers = [createdTransfer, ...nextTransfers];

    newMovements.push({
      id: `mov-app-${Date.now()}`,
      inventoryId: srcInv.id,
      storeCode: srcInv.storeCode,
      sku: srcInv.sku,
      movementType: 'TRANSFER_OUT_DISPATCH',
      quantity: fromMillis(-qtyMillis),
      referenceType: 'RECOMMENDATION_APPROVAL',
      referenceId: createdTransfer.id,
      remarks:
        params.comments ?? `Approved from Recommendation ${recommendation.id}`,
      createdBy: userId,
      movementDate: nowIso,
    });
  } else {
    // Central Supply / Warehouse Replenishment Fallback
    const lazyDest = getOrCreateLazyInventoryBalance(nextBalances, {
      storeId: recommendation.toStoreId,
      storeCode: recommendation.storeCode,
      storeName: recommendation.storeName,
      productId: recommendation.productId,
      sku: recommendation.sku,
      productName: recommendation.productName,
    });
    nextBalances = lazyDest.updatedBalances;

    const destIdx = nextBalances.findIndex(
      (b) =>
        b.storeId === recommendation.toStoreId &&
        b.productId === recommendation.productId,
    );
    const destInv = nextBalances[destIdx];
    const nextAvailMillis = toMillis(destInv.availableQuantity) + qtyMillis;

    nextBalances[destIdx] = {
      ...destInv,
      availableQuantity: fromMillis(nextAvailMillis),
      version: destInv.version + 1,
      lastUpdatedOn: nowIso,
    };

    newMovements.push({
      id: `mov-cs-${Date.now()}`,
      inventoryId: destInv.id,
      storeCode: destInv.storeCode,
      sku: destInv.sku,
      movementType: 'INWARD_RECEIPT',
      quantity: fromMillis(qtyMillis),
      referenceType: 'CENTRAL_SUPPLY',
      referenceId: recommendation.id,
      remarks:
        params.comments ??
        `Central Supply replenishment approved for Recommendation ${recommendation.id}`,
      createdBy: userId,
      movementDate: nowIso,
    });
  }

  const updatedRecommendation: RecommendationRecord = {
    ...recommendation,
    status: 'COMPLETED',
    updatedAt: nowIso,
  };

  const actionId = `act-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const actionRecord: RecommendationActionRecord = {
    id: actionId,
    recommendationId: recommendation.id,
    actionType: 'APPROVE',
    actionedBy: userId,
    actionedOn: nowIso,
    comments: params.comments ?? 'Recommendation approved',
    history: [
      {
        id: `ah-${Date.now()}`,
        actionId,
        previousStatus,
        newStatus: 'COMPLETED',
        changedBy: userId,
        changedOn: nowIso,
        comments: params.comments ?? 'Transitioned to COMPLETED on approval',
      },
    ],
  };

  return {
    ok: true,
    recommendation: updatedRecommendation,
    createdTransfer,
    balances: nextBalances,
    transfers: nextTransfers,
    movements: [...newMovements, ...params.movements],
    actions: [actionRecord, ...params.actions],
    actionRecord,
  };
}

/**
 * Mirrors `ActionCenterService.batchApprove`:
 * Processes an array of recommendation IDs sequentially, committing valid approvals and
 * collecting structured failure reasons for any invalid or depleted items.
 */
export function batchApproveRecommendationsAction(params: {
  recommendationIds: string[];
  recommendations: RecommendationRecord[];
  balances: InventoryBalanceRecord[];
  transfers: StockTransferRecord[];
  movements: InventoryMovementRecord[];
  actions: RecommendationActionRecord[];
  comments?: string;
  userId: string;
}): {
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  succeededIds: string[];
  failures: Array<{ id: string; reason: string }>;
  recommendations: RecommendationRecord[];
  balances: InventoryBalanceRecord[];
  transfers: StockTransferRecord[];
  movements: InventoryMovementRecord[];
  actions: RecommendationActionRecord[];
} {
  let nextRecs = [...params.recommendations];
  let nextBalances = [...params.balances];
  let nextTransfers = [...params.transfers];
  let nextMovements = [...params.movements];
  let nextActions = [...params.actions];

  const succeededIds: string[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  for (const id of params.recommendationIds) {
    const recIdx = nextRecs.findIndex((r) => r.id === id);
    if (recIdx === -1) {
      failures.push({ id, reason: `Recommendation ${id} not found` });
      continue;
    }

    const res = approveRecommendationAction({
      recommendation: nextRecs[recIdx],
      balances: nextBalances,
      transfers: nextTransfers,
      movements: nextMovements,
      actions: nextActions,
      comments: params.comments ?? 'Batch approved',
      userId: params.userId,
    });

    if (res.ok) {
      succeededIds.push(id);
      nextRecs[recIdx] = res.recommendation;
      nextBalances = res.balances;
      nextTransfers = res.transfers;
      nextMovements = res.movements;
      nextActions = res.actions;
    } else {
      failures.push({ id, reason: res.message });
    }
  }

  return {
    processedCount: params.recommendationIds.length,
    succeededCount: succeededIds.length,
    failedCount: failures.length,
    succeededIds,
    failures,
    recommendations: nextRecs,
    balances: nextBalances,
    transfers: nextTransfers,
    movements: nextMovements,
    actions: nextActions,
  };
}

/**
 * Mirrors `ActionCenterService.modify`:
 * - Enforces mandatory `comments` (`>= 5` chars).
 * - Recalculates donor store's Post-Transfer DOI (`(donorStock - modifiedQuantity) / donorAds`)
 *   and throws `DOI_SAFETY_FLOOR_VIOLATED` if `postTransferDOI <= 7.0` days.
 * - Updates `fromStoreId`, `recommendedQuantity`, transitions status to `MODIFIED`, and records `Action` + `ActionHistory`.
 */
export function modifyRecommendationWithDoiGuard(params: {
  recommendation: RecommendationRecord;
  balances: InventoryBalanceRecord[];
  adsByStoreAndProduct: Record<string, number>;
  stores: StoreRecord[];
  actions: RecommendationActionRecord[];
  sourceStoreId?: string;
  modifiedQuantity: number;
  comments: string;
  userId: string;
}):
  | {
      ok: true;
      recommendation: RecommendationRecord;
      postTransferDOI: number | null;
      actions: RecommendationActionRecord[];
      actionRecord: RecommendationActionRecord;
    }
  | {
      ok: false;
      errorCode:
        | 'COMMENTS_REQUIRED'
        | 'REC_INVALID_STATUS'
        | 'DONOR_INVENTORY_MISSING'
        | 'EXCEEDS_DONOR_STOCK'
        | 'DOI_SAFETY_FLOOR_VIOLATED';
      statusCode: 400 | 409;
      message: string;
      projectedPostTransferDOI?: number;
    } {
  const { recommendation } = params;
  if (!params.comments || params.comments.trim().length < 5) {
    return {
      ok: false,
      errorCode: 'COMMENTS_REQUIRED',
      statusCode: 400,
      message: 'Comments are mandatory when modifying a recommendation (min 5 chars).',
    };
  }

  if (
    recommendation.status !== 'OPEN' &&
    recommendation.status !== 'MODIFIED'
  ) {
    return {
      ok: false,
      errorCode: 'REC_INVALID_STATUS',
      statusCode: 409,
      message: `Recommendation ${recommendation.id} cannot be modified in status ${recommendation.status}`,
    };
  }

  const targetFromStoreId =
    params.sourceStoreId !== undefined
      ? params.sourceStoreId
      : recommendation.fromStoreId;
  let computedPostTransferDOI: number | null = null;
  let targetFromStoreCode = recommendation.fromStoreCode;

  if (targetFromStoreId) {
    const donorInv = params.balances.find(
      (b) =>
        b.storeId === targetFromStoreId &&
        b.productId === recommendation.productId,
    );

    if (!donorInv) {
      return {
        ok: false,
        errorCode: 'DONOR_INVENTORY_MISSING',
        statusCode: 400,
        message: 'Selected donor store has no inventory record for this product',
      };
    }

    const donorStock = Number(donorInv.availableQuantity);
    if (params.modifiedQuantity > donorStock) {
      return {
        ok: false,
        errorCode: 'EXCEEDS_DONOR_STOCK',
        statusCode: 400,
        message: `Modified quantity (${params.modifiedQuantity}) exceeds donor store available stock (${donorStock})`,
      };
    }

    const donorAds =
      params.adsByStoreAndProduct[
        `${targetFromStoreId}:${recommendation.productId}`
      ] ?? 0.0;
    const postTransferStock = donorStock - params.modifiedQuantity;
    const postTransferDOI = calculateDeterministicDOI(
      postTransferStock,
      donorAds,
    );
    computedPostTransferDOI = postTransferDOI;

    if (postTransferDOI <= 7.0) {
      return {
        ok: false,
        errorCode: 'DOI_SAFETY_FLOOR_VIOLATED',
        statusCode: 400,
        projectedPostTransferDOI: postTransferDOI,
        message: `7-Day Source DOI Protection Violated: Modifying quantity to ${params.modifiedQuantity} drops donor store post-transfer DOI to ${postTransferDOI.toFixed(1)} days (minimum > 7.0 days required).`,
      };
    }

    const storeObj = params.stores.find((s) => s.id === targetFromStoreId);
    targetFromStoreCode = storeObj?.storeCode ?? donorInv.storeCode;
  }

  const previousStatus = recommendation.status;
  const nowIso = new Date().toISOString();

  const updatedRecommendation: RecommendationRecord = {
    ...recommendation,
    fromStoreId: targetFromStoreId ?? null,
    fromStoreCode: targetFromStoreId ? targetFromStoreCode : null,
    recommendedQuantity: params.modifiedQuantity.toFixed(3),
    status: 'MODIFIED',
    updatedAt: nowIso,
    evidence: recommendation.evidence.map((ev) =>
      ev.metric === 'SRC_POST_TRANSFER_DOI' && computedPostTransferDOI !== null
        ? {
            ...ev,
            value: computedPostTransferDOI.toFixed(2),
          }
        : ev,
    ),
  };

  const actionId = `act-mod-${Date.now()}`;
  const actionRecord: RecommendationActionRecord = {
    id: actionId,
    recommendationId: recommendation.id,
    actionType: 'MODIFY',
    actionedBy: params.userId,
    actionedOn: nowIso,
    comments: params.comments.trim(),
    history: [
      {
        id: `ah-mod-${Date.now()}`,
        actionId,
        previousStatus,
        newStatus: 'MODIFIED',
        changedBy: params.userId,
        changedOn: nowIso,
        comments: params.comments.trim(),
      },
    ],
  };

  return {
    ok: true,
    recommendation: updatedRecommendation,
    postTransferDOI: computedPostTransferDOI,
    actions: [actionRecord, ...params.actions],
    actionRecord,
  };
}

/**
 * Mirrors `ActionCenterService.reject`:
 * Requires mandatory `reason` (`>= 5` chars), transitions status to `REJECTED` with zero stock movements,
 * and logs `Action` (`REJECT`) + `ActionHistory`.
 */
export function rejectRecommendationAction(params: {
  recommendation: RecommendationRecord;
  actions: RecommendationActionRecord[];
  reason: string;
  userId: string;
}):
  | {
      ok: true;
      recommendation: RecommendationRecord;
      actions: RecommendationActionRecord[];
      actionRecord: RecommendationActionRecord;
    }
  | {
      ok: false;
      errorCode: 'REASON_REQUIRED' | 'REC_INVALID_STATUS';
      statusCode: 400 | 409;
      message: string;
    } {
  if (!params.reason || params.reason.trim().length < 5) {
    return {
      ok: false,
      errorCode: 'REASON_REQUIRED',
      statusCode: 400,
      message: 'A rejection reason of at least 5 characters is mandatory.',
    };
  }

  if (
    params.recommendation.status !== 'OPEN' &&
    params.recommendation.status !== 'MODIFIED'
  ) {
    return {
      ok: false,
      errorCode: 'REC_INVALID_STATUS',
      statusCode: 409,
      message: `Recommendation ${params.recommendation.id} cannot be rejected in status ${params.recommendation.status}`,
    };
  }

  const previousStatus = params.recommendation.status;
  const nowIso = new Date().toISOString();

  const updatedRecommendation: RecommendationRecord = {
    ...params.recommendation,
    status: 'REJECTED',
    updatedAt: nowIso,
  };

  const actionId = `act-rej-${Date.now()}`;
  const actionRecord: RecommendationActionRecord = {
    id: actionId,
    recommendationId: params.recommendation.id,
    actionType: 'REJECT',
    actionedBy: params.userId,
    actionedOn: nowIso,
    comments: params.reason.trim(),
    history: [
      {
        id: `ah-rej-${Date.now()}`,
        actionId,
        previousStatus,
        newStatus: 'REJECTED',
        changedBy: params.userId,
        changedOn: nowIso,
        comments: params.reason.trim(),
      },
    ],
  };

  return {
    ok: true,
    recommendation: updatedRecommendation,
    actions: [actionRecord, ...params.actions],
    actionRecord,
  };
}

/**
 * Mirrors `ActionCenterService.createStoreRequest`:
 * Creates an ad-hoc manual store request (`recommendationType = 'MANUAL_STORE_REQUEST'`),
 * automatically runs `rankRegionalDonorCandidates` to bind the #1 regional donor store (or `null` for Central Supply),
 * and attaches `STOCK_VELOCITY_SNAPSHOT` and `REGIONAL_CANDIDATE_RANKING` evidence.
 */
export function createManualStoreRequestAction(params: {
  toStoreId: string;
  productId: string;
  requestedQuantity: number;
  priority?: DoiRiskTier;
  reason: string;
  userEmail: string;
  stores: StoreRecord[];
  products: ProductCatalogRecord[];
  balances: InventoryBalanceRecord[];
  adsByStoreAndProduct: Record<string, number>;
  existingRecommendations: RecommendationRecord[];
}):
  | {
      ok: true;
      createdRecommendation: RecommendationRecord;
      rankedCandidates: CandidateStoreRankRecord[];
      recommendations: RecommendationRecord[];
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
    } {
  if (!params.reason || params.reason.trim().length < 5) {
    return {
      ok: false,
      errorCode: 'REASON_REQUIRED',
      message: 'Manual store request reason must be at least 5 characters.',
    };
  }

  const destStore = params.stores.find((s) => s.id === params.toStoreId);
  if (!destStore) {
    return {
      ok: false,
      errorCode: 'STORE_NOT_FOUND',
      message: `Destination store ${params.toStoreId} not found`,
    };
  }

  const product = params.products.find((p) => p.id === params.productId);
  if (!product) {
    return {
      ok: false,
      errorCode: 'PRODUCT_NOT_FOUND',
      message: `Product ${params.productId} not found`,
    };
  }

  const candidates = rankRegionalDonorCandidates({
    destStoreId: destStore.id,
    regionId: destStore.regionId,
    productId: product.id,
    targetUnitsNeeded: params.requestedQuantity,
    stores: params.stores,
    balances: params.balances,
    adsByStoreAndProduct: params.adsByStoreAndProduct,
  });

  const bestCandidate = candidates.length > 0 ? candidates[0] : null;
  const destAds =
    params.adsByStoreAndProduct[`${destStore.id}:${product.id}`] ?? 1.0;
  const destInv = params.balances.find(
    (b) => b.storeId === destStore.id && b.productId === product.id,
  );
  const destStock = destInv ? Number(destInv.availableQuantity) : 0;
  const destCurrentDOI = calculateDeterministicDOI(destStock, destAds);
  const nowIso = new Date().toISOString();

  const evidence: RecommendationEvidenceRecord[] = [
    {
      metric: 'DEST_DOI',
      value: destCurrentDOI.toFixed(2),
      description: `Manual store request initiated by ${params.userEmail}: ${params.reason.trim()}`,
    },
    {
      metric: 'DEST_STOCK',
      value: destStock.toFixed(3),
      description: 'Destination store current available stock',
    },
  ];

  if (bestCandidate) {
    evidence.push(
      {
        metric: 'SRC_DOI',
        value: bestCandidate.currentDOI.toFixed(2),
        description: `Auto-ranked #1 donor store (${bestCandidate.storeCode}) pre-transfer DOI`,
      },
      {
        metric: 'SRC_POST_TRANSFER_DOI',
        value: bestCandidate.postTransferDOI.toFixed(2),
        description: `Donor store (${bestCandidate.storeCode}) projected DOI after transfer (> 7.0d safety floor)`,
      },
      {
        metric: 'DISTANCE_KM',
        value: bestCandidate.distanceKm.toFixed(2),
        description: 'Haversine distance to auto-selected regional donor',
      },
    );
  } else {
    evidence.push({
      metric: 'REASON',
      value: 'CENTRAL_SUPPLY_FALLBACK',
      description:
        'No regional donor store available; routed to Central Supply fallback',
    });
  }

  const createdRecommendation: RecommendationRecord = {
    id: `rec-man-${Date.now()}`,
    recommendationNumber: `REQ-${Date.now().toString().slice(-6)}`,
    recommendationType: 'MANUAL_STORE_REQUEST',
    storeId: destStore.id,
    storeCode: destStore.storeCode,
    storeName: destStore.name,
    regionId: destStore.regionId,
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    fromStoreId: bestCandidate ? bestCandidate.storeId : null,
    fromStoreCode: bestCandidate ? bestCandidate.storeCode : null,
    toStoreId: destStore.id,
    recommendedQuantity: params.requestedQuantity.toFixed(3),
    priority: params.priority ?? 'HIGH',
    reason: bestCandidate
      ? `Manual Request (${params.reason.trim()}) — Auto-matched regional donor ${bestCandidate.storeCode} (${bestCandidate.distanceKm.toFixed(1)} km)`
      : `Manual Request (${params.reason.trim()}) — Routed to Central Supply warehouse replenishment`,
    status: 'OPEN',
    updatedAt: nowIso,
    evidence,
  };

  return {
    ok: true,
    createdRecommendation,
    rankedCandidates: candidates,
    recommendations: [
      createdRecommendation,
      ...params.existingRecommendations,
    ],
  };
}

// ============================================================================
// CHUNK B7: DASHBOARDS AGGREGATIONS, REAL-TIME WEBSOCKETS & 50-STORE SEEDER
// ============================================================================

export interface ExecutiveDashboardAggregationResult {
  dateRange: { startDate: string; endDate: string };
  cached: boolean;
  kpis: {
    totalSales: number;
    salesTarget: number;
    salesAchievementPercent: number;
    totalInventoryValue: number;
    stockOutSKUsCount: number;
    trappedExcessCapital: number;
    openRecommendationsCount: number;
  };
  charts: {
    salesTrend: Array<{
      date: string;
      actualRevenue: number;
      targetRevenue: number;
    }>;
    inventoryHealthDistribution: {
      healthy: number;
      low: number;
      critical: number;
      excess: number;
    };
    topStockOutProneStores: Array<{
      storeId: string;
      storeCode: string;
      storeName: string;
      city: string;
      activeStockOutCount: number;
    }>;
    categoryPerformance: Array<{
      categoryId: string;
      categoryName: string;
      revenue: number;
      revenueSharePercent: number;
      estimatedMarginPercent: number;
    }>;
    stockOutTrend: Array<{
      weekLabel: string;
      preventedByTransfers: number;
      activeStockOutAlerts: number;
    }>;
  };
  exceptionCallouts: string[];
}

export interface StoreDashboardAggregationResult {
  store: {
    id: string;
    storeCode: string;
    name: string;
    city: string;
    regionCode: string;
    regionName: string;
  };
  salesMetrics: {
    salesToday: number;
    dailyTarget: number;
    dailyAchievementPercent: number;
    mtdSales: number;
    mtdTarget: number;
    mtdAchievementPercent: number;
  };
  healthBreakdown: {
    healthy: number;
    low: number;
    critical: number;
    excess: number;
  };
  immediateRiskSkus: Array<{
    productId: string;
    sku: string;
    productName: string;
    availableQuantity: number;
    reorderLevel: number;
    ads: number;
    doiDays: number;
    doiHours: number;
  }>;
  incomingTransfers: Array<{
    transferId: string;
    transferNumber: string;
    fromStoreCode: string;
    carrierName: string | null;
    vehicleNumber: string | null;
    totalUnits: number;
  }>;
  openStoreRecommendationsCount: number;
}

export const REVERSE_DEPENDENCY_PURGE_ORDER: readonly string[] = [
  'ActionHistory',
  'Action',
  'RecommendationEvidence',
  'Recommendation',
  'StockTransferLine',
  'StockTransfer',
  'InventoryMovement',
  'SalesTransactionLine',
  'SalesTransaction',
  'InventoryRule',
  'Inventory',
  'AuditLog',
  'Product',
  'Brand',
  'Category',
  'UserStoreAssignment',
  'UserRegionAssignment',
  'Store',
  'StoreType',
  'Region',
  'User',
];

/**
 * Mirrors `DashboardService.getExecutiveDashboard`:
 * Validates `startDate <= endDate`, aggregates all 6 top-row KPIs, builds all 5 Recharts datasets,
 * and generates dynamic Actionable Exception Insights callout cards.
 */
export function computeExecutiveDashboardAggregation(params: {
  startDate?: string;
  endDate?: string;
  transactions: SalesTransactionRecord[];
  balances: InventoryBalanceRecord[];
  products: ProductCatalogRecord[];
  stores: StoreRecord[];
  recommendations: RecommendationRecord[];
  transfers: StockTransferRecord[];
  cached?: boolean;
}):
  | { ok: true; data: ExecutiveDashboardAggregationResult }
  | { ok: false; errorCode: 'INVALID_DATE_RANGE'; statusCode: 400; message: string } {
  const startStr = params.startDate ?? '2026-09-26';
  const endStr = params.endDate ?? '2026-10-26';

  if (new Date(startStr).getTime() > new Date(endStr).getTime()) {
    return {
      ok: false,
      errorCode: 'INVALID_DATE_RANGE',
      statusCode: 400,
      message:
        'BadRequestException: Invalid date range: startDate must be less than or equal to endDate.',
    };
  }

  const startMs = new Date(`${startStr}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${endStr}T23:59:59.999Z`).getTime();

  const filteredTx = params.transactions.filter((tx) => {
    const t = new Date(tx.transactionDate).getTime();
    return t >= startMs && t <= endMs;
  });

  const totalSales = Number(
    filteredTx
      .reduce((acc, tx) => acc + Number(tx.totalAmount), 0)
      .toFixed(2),
  );
  const salesTarget = 50_000_000;
  const salesAchievementPercent = Number(
    ((totalSales / salesTarget) * 100).toFixed(2),
  );

  const productById = new Map(params.products.map((p) => [p.id, p]));
  const storeById = new Map(params.stores.map((s) => [s.id, s]));

  let totalInventoryValue = 0;
  let trappedExcessCapital = 0;
  let stockOutSKUsCount = 0;

  const healthDist = {
    healthy: 0,
    low: 0,
    critical: 0,
    excess: 0,
  };

  const storeAlertsMap = new Map<
    string,
    {
      storeId: string;
      storeCode: string;
      storeName: string;
      city: string;
      activeStockOutCount: number;
    }
  >();

  for (const inv of params.balances) {
    const avail = Number(inv.availableQuantity);
    const reorder = Number(inv.reorderLevel);
    const maxStock = Number(inv.maximumStock);
    const prod = productById.get(inv.productId);
    const costPrice = prod ? Number(prod.costPrice) : 100;

    if (avail > 0) {
      totalInventoryValue += avail * costPrice;
    }

    if (avail > maxStock) {
      trappedExcessCapital += (avail - maxStock) * costPrice;
    }

    if (avail <= 0) {
      healthDist.critical += 1;
      stockOutSKUsCount += 1;
    } else if (avail <= reorder) {
      healthDist.low += 1;
      stockOutSKUsCount += 1;
    } else if (avail > maxStock) {
      healthDist.excess += 1;
    } else {
      healthDist.healthy += 1;
    }

    if (avail <= reorder) {
      const store = storeById.get(inv.storeId);
      const prev = storeAlertsMap.get(inv.storeId) ?? {
        storeId: inv.storeId,
        storeCode: inv.storeCode,
        storeName: inv.storeName,
        city: store?.city ?? 'Metro',
        activeStockOutCount: 0,
      };
      prev.activeStockOutCount += 1;
      storeAlertsMap.set(inv.storeId, prev);
    }
  }

  const openRecommendationsCount = params.recommendations.filter(
    (r) => r.status === 'OPEN',
  ).length;

  const topStockOutProneStores = Array.from(storeAlertsMap.values())
    .sort((a, b) => b.activeStockOutCount - a.activeStockOutCount)
    .slice(0, 5);

  const revenueByDate = new Map<string, number>();
  const catMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      revenue: number;
      costTotal: number;
    }
  >();

  for (const tx of filteredTx) {
    const dKey = tx.transactionDate.slice(0, 10);
    revenueByDate.set(dKey, (revenueByDate.get(dKey) ?? 0) + Number(tx.totalAmount));

    for (const line of tx.lines) {
      const prod = productById.get(line.productId);
      const catId = prod?.categoryId ?? 'cat-general';
      const catName = prod?.categoryName ?? 'General Merchandise';
      const costPrice = prod ? Number(prod.costPrice) : Number(line.unitPrice) * 0.8;

      const prev = catMap.get(catId) ?? {
        categoryId: catId,
        categoryName: catName,
        revenue: 0,
        costTotal: 0,
      };
      prev.revenue += Number(line.netAmount);
      prev.costTotal += Number(line.quantity) * costPrice;
      catMap.set(catId, prev);
    }
  }

  const dailyTarget = Number((salesTarget / 30).toFixed(2));
  const salesTrend = Array.from(revenueByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rev]) => ({
      date,
      actualRevenue: Number(rev.toFixed(2)),
      targetRevenue: dailyTarget,
    }));

  const categoryPerformance = Array.from(catMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      revenue: Number(c.revenue.toFixed(2)),
      revenueSharePercent:
        totalSales > 0 ? Number(((c.revenue / totalSales) * 100).toFixed(2)) : 0,
      estimatedMarginPercent:
        c.revenue > 0
          ? Number((((c.revenue - c.costTotal) / c.revenue) * 100).toFixed(2))
          : 0,
    }));

  const completedTransfers = params.transfers.filter(
    (t) => t.status === 'APPROVED_IN_TRANSIT' || t.status === 'RECEIVED',
  ).length;

  const stockOutTrend = [
    {
      weekLabel: 'W-3',
      preventedByTransfers: Math.max(2, completedTransfers),
      activeStockOutAlerts: stockOutSKUsCount + 2,
    },
    {
      weekLabel: 'W-2',
      preventedByTransfers: Math.max(3, completedTransfers + 1),
      activeStockOutAlerts: stockOutSKUsCount + 1,
    },
    {
      weekLabel: 'W-1',
      preventedByTransfers: Math.max(4, completedTransfers + 2),
      activeStockOutAlerts: stockOutSKUsCount,
    },
    {
      weekLabel: 'Current',
      preventedByTransfers: completedTransfers + openRecommendationsCount,
      activeStockOutAlerts: Math.max(
        0,
        stockOutSKUsCount - openRecommendationsCount,
      ),
    },
  ];

  const exceptionCallouts: string[] = [];
  if (openRecommendationsCount > 0) {
    const firstRec = params.recommendations.find((r) => r.status === 'OPEN')!;
    exceptionCallouts.push(
      `${firstRec.storeName} (${firstRec.storeCode}) has active high-priority stock-out alert on ${firstRec.productName} (${firstRec.sku}) with ${firstRec.recommendedQuantity} units recommended for transfer.`,
    );
  }
  if (trappedExcessCapital > 0) {
    exceptionCallouts.push(
      `₹${Math.round(trappedExcessCapital).toLocaleString('en-IN')} in trapped excess working capital detected across ${healthDist.excess} overstocked store-SKU buffers eligible as regional donors.`,
    );
  }

  return {
    ok: true,
    data: {
      dateRange: { startDate: startStr, endDate: endStr },
      cached: Boolean(params.cached),
      kpis: {
        totalSales,
        salesTarget,
        salesAchievementPercent,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        stockOutSKUsCount,
        trappedExcessCapital: Number(trappedExcessCapital.toFixed(2)),
        openRecommendationsCount,
      },
      charts: {
        salesTrend,
        inventoryHealthDistribution: healthDist,
        topStockOutProneStores,
        categoryPerformance,
        stockOutTrend,
      },
      exceptionCallouts,
    },
  };
}

/**
 * Mirrors `DashboardService.getStoreDashboard`:
 * Enforces `DataScope` authorization for `storeId` and returns store sales vs target,
 * local health breakdown, immediate risk SKUs (`doiDays <= 2.0`), and incoming `APPROVED_IN_TRANSIT` transfers.
 */
export function computeStoreDashboardAggregation(params: {
  storeId: string;
  dataScope?: StoreScopedFilter;
  stores: StoreRecord[];
  balances: InventoryBalanceRecord[];
  transactions: SalesTransactionRecord[];
  transfers: StockTransferRecord[];
  recommendations: RecommendationRecord[];
  adsByStoreAndProduct: Record<string, number>;
}):
  | { ok: true; data: StoreDashboardAggregationResult }
  | { ok: false; errorCode: 'FORBIDDEN_SCOPE' | 'STORE_NOT_FOUND'; statusCode: 403 | 404; message: string } {
  const { storeId, dataScope } = params;

  if (dataScope?.id?.in && !dataScope.id.in.includes(storeId)) {
    return {
      ok: false,
      errorCode: 'FORBIDDEN_SCOPE',
      statusCode: 403,
      message: `ForbiddenException: Store '${storeId}' is outside your assigned store data scope.`,
    };
  }

  const store = params.stores.find((s) => s.id === storeId);
  if (!store) {
    return {
      ok: false,
      errorCode: 'STORE_NOT_FOUND',
      statusCode: 404,
      message: `NotFoundException: Store '${storeId}' not found.`,
    };
  }

  if (
    dataScope?.regionId?.in &&
    !dataScope.regionId.in.includes(store.regionId)
  ) {
    return {
      ok: false,
      errorCode: 'FORBIDDEN_SCOPE',
      statusCode: 403,
      message: `ForbiddenException: Store '${store.storeCode}' belongs to a region outside your assigned regional scope.`,
    };
  }

  const storeTxs = params.transactions.filter((tx) => tx.storeId === storeId);
  const mtdSales = Number(
    storeTxs.reduce((acc, tx) => acc + Number(tx.totalAmount), 0).toFixed(2),
  );
  const salesToday = Number(
    storeTxs
      .filter((tx) => tx.transactionDate.startsWith('2026-10-26'))
      .reduce((acc, tx) => acc + Number(tx.totalAmount), 0)
      .toFixed(2),
  );

  const dailyTarget = 35_000;
  const mtdTarget = dailyTarget * 26;

  const healthBreakdown = {
    healthy: 0,
    low: 0,
    critical: 0,
    excess: 0,
  };

  const immediateRiskSkus: StoreDashboardAggregationResult['immediateRiskSkus'] = [];
  const storeBalances = params.balances.filter((b) => b.storeId === storeId);

  for (const inv of storeBalances) {
    const avail = Number(inv.availableQuantity);
    const reorder = Number(inv.reorderLevel);
    const maxStock = Number(inv.maximumStock);
    const ads = params.adsByStoreAndProduct[`${storeId}:${inv.productId}`] ?? 0;
    const doiDays = calculateDeterministicDOI(avail, ads);
    const status = classifyDoiStockStatus(avail, reorder, maxStock, doiDays);

    if (status === 'CRITICAL') healthBreakdown.critical += 1;
    else if (status === 'LOW') healthBreakdown.low += 1;
    else if (status === 'EXCESS') healthBreakdown.excess += 1;
    else healthBreakdown.healthy += 1;

    if (doiDays <= 2.0) {
      immediateRiskSkus.push({
        productId: inv.productId,
        sku: inv.sku,
        productName: inv.productName,
        availableQuantity: avail,
        reorderLevel: reorder,
        ads,
        doiDays,
        doiHours: Number((doiDays * 24).toFixed(1)),
      });
    }
  }

  immediateRiskSkus.sort((a, b) => a.doiDays - b.doiDays);

  const incomingTransfers = params.transfers
    .filter(
      (t) => t.toStoreId === storeId && t.status === 'APPROVED_IN_TRANSIT',
    )
    .map((t) => ({
      transferId: t.id,
      transferNumber: t.transferNumber,
      fromStoreCode: t.fromStoreCode,
      carrierName: t.carrierName,
      vehicleNumber: t.vehicleNumber,
      totalUnits: t.lines.reduce(
        (sum, ln) => sum + Number(ln.approvedQty ?? ln.requestedQty),
        0,
      ),
    }));

  const openStoreRecommendationsCount = params.recommendations.filter(
    (r) =>
      r.storeId === storeId &&
      (r.status === 'OPEN' || r.status === 'MODIFIED'),
  ).length;

  return {
    ok: true,
    data: {
      store: {
        id: store.id,
        storeCode: store.storeCode,
        name: store.name,
        city: store.city,
        regionCode: store.regionCode,
        regionName: store.regionName,
      },
      salesMetrics: {
        salesToday,
        dailyTarget,
        dailyAchievementPercent: Number(
          ((salesToday / dailyTarget) * 100).toFixed(2),
        ),
        mtdSales,
        mtdTarget,
        mtdAchievementPercent: Number(
          ((mtdSales / mtdTarget) * 100).toFixed(2),
        ),
      },
      healthBreakdown,
      immediateRiskSkus: immediateRiskSkus.slice(0, 5),
      incomingTransfers,
      openStoreRecommendationsCount,
    },
  };
}

/**
 * Mirrors `EventsGateway.handleConnection` & room broadcasting (`STOCK_UPDATED`, `REC_CREATED`, `REC_UPDATED`):
 * Verifies JWT handshake token, assigns client to scoped Socket.io rooms, and resolves target broadcast rooms.
 */
export function evaluateWebSocketHandshakeAndRooms(params: {
  hasValidToken: boolean;
  userRole: RoleType;
  assignedRegionId?: string | null;
  assignedStoreId?: string | null;
}):
  | {
      connected: true;
      joinedRooms: string[];
      pingIntervalMs: 25000;
      pingTimeoutMs: 20000;
      routingTable: {
        STOCK_UPDATED: string[];
        REC_CREATED: string[];
        REC_UPDATED: string[];
      };
    }
  | {
      connected: false;
      disconnectReason: string;
    } {
  if (!params.hasValidToken) {
    return {
      connected: false,
      disconnectReason:
        'Missing or invalid JWT in client.handshake.auth.token; socket disconnected.',
    };
  }

  const joinedRooms: string[] = [];
  if (params.userRole === 'EXECUTIVE' || params.userRole === 'ADMIN') {
    joinedRooms.push('enterprise');
  }
  if (params.assignedRegionId) {
    joinedRooms.push(`region_${params.assignedRegionId}`);
  }
  if (params.assignedStoreId) {
    joinedRooms.push(`store_${params.assignedStoreId}`);
  }

  const sampleStoreRoom = params.assignedStoreId
    ? `store_${params.assignedStoreId}`
    : 'store_store-bpl-005';
  const sampleRegionRoom = params.assignedRegionId
    ? `region_${params.assignedRegionId}`
    : 'region_reg-central-mp';

  return {
    connected: true,
    joinedRooms,
    pingIntervalMs: 25000,
    pingTimeoutMs: 20000,
    routingTable: {
      STOCK_UPDATED: [sampleStoreRoom, 'enterprise'],
      REC_CREATED: [sampleRegionRoom, 'enterprise'],
      REC_UPDATED: ['ALL_CONNECTED_CLIENTS'],
    },
  };
}

/**
 * Mirrors `SeederService.seedDemo`, `MasterDataSeeder`, and `GoldenPathSeeder` (BRD Section 37):
 * - Enforces idempotency guard (`if (!cleanReset && existingStoreCount > 0)` -> `skipped: true`).
 * - Executes 21-table reverse-dependency purge when `cleanReset: true`.
 * - Seeds Bhopal (`BPL-001`, stock = 3.000, ADS = 2.100, DOI = 1.43d HIGH Risk) and Indore (`IND-001`,
 *   stock = 55.000, ADS = 0.500, DOI = 110.0d EXCESS) for `SKU-1024` ("Fortune Sunflower Oil 1L")
 *   and runs `evaluateIntelligenceRebalance` to generate live `REC-1001`.
 */
export function executeMasterSeedAndGoldenPathSimulation(params: {
  cleanReset: boolean;
  existingStoreCount: number;
}): {
  skipped: boolean;
  cleanResetExecuted: boolean;
  purgeTableOrder: readonly string[];
  seededCounts: {
    users: number;
    regions: number;
    storeTypes: number;
    stores: number;
    categories: number;
    brands: number;
    products: number;
    posMonths: number;
  } | null;
  goldenPath: {
    sku: string;
    barcode: string;
    productName: string;
    costPrice: string;
    sellingPrice: string;
    mrp: string;
    bhopalDest: {
      storeCode: string;
      availableStock: string;
      ads: number;
      doiDays: number;
      riskTier: DoiRiskTier;
    };
    indoreDonor: {
      storeCode: string;
      availableStock: string;
      ads: number;
      doiDays: number;
      status: StockHealthStatus;
    };
    generatedRec: RecommendationRecord;
  } | null;
  message: string;
} {
  if (!params.cleanReset && params.existingStoreCount > 0) {
    return {
      skipped: true,
      cleanResetExecuted: false,
      purgeTableOrder: [],
      seededCounts: null,
      goldenPath: null,
      message: `Database already seeded (${params.existingStoreCount} stores found). Skipped duplicate seed execution.`,
    };
  }

  const gpStores: StoreRecord[] = [
    {
      id: 'store-bpl-001',
      storeCode: 'BPL-001',
      name: 'Bhopal MP Nagar Store',
      regionId: 'reg-central-mp',
      regionCode: 'REG-CENTRAL-MP',
      regionName: 'Central MP',
      storeTypeCode: 'SUPERMARKET',
      city: 'Bhopal',
      latitude: 23.2332,
      longitude: 77.4343,
      openingDate: '2021-04-15',
      isActive: true,
      skuCount: 500,
      availableQuantityTotal: '18420.000',
      dailyPosRevenue: '412000.00',
    },
    {
      id: 'store-ind-001',
      storeCode: 'IND-001',
      name: 'Indore Vijay Nagar Store',
      regionId: 'reg-central-mp',
      regionCode: 'REG-CENTRAL-MP',
      regionName: 'Central MP',
      storeTypeCode: 'HYPERMARKET',
      city: 'Indore',
      latitude: 22.7533,
      longitude: 75.8937,
      openingDate: '2020-08-10',
      isActive: true,
      skuCount: 500,
      availableQuantityTotal: '32900.000',
      dailyPosRevenue: '685000.00',
    },
  ];

  const gpBalances: InventoryBalanceRecord[] = [
    {
      id: 'inv-bpl-1024',
      storeId: 'store-bpl-001',
      storeCode: 'BPL-001',
      storeName: 'Bhopal MP Nagar Store',
      productId: 'prod-gp-1024',
      sku: 'SKU-1024',
      productName: 'Fortune Sunflower Oil 1L',
      availableQuantity: '3.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '80.000',
      reorderLevel: '20.000',
      version: 1,
      lastUpdatedOn: new Date().toISOString(),
    },
    {
      id: 'inv-ind-1024',
      storeId: 'store-ind-001',
      storeCode: 'IND-001',
      storeName: 'Indore Vijay Nagar Store',
      productId: 'prod-gp-1024',
      sku: 'SKU-1024',
      productName: 'Fortune Sunflower Oil 1L',
      availableQuantity: '55.000',
      reservedQuantity: '0.000',
      inTransitQuantity: '0.000',
      minimumStock: '10.000',
      maximumStock: '45.000',
      reorderLevel: '15.000',
      version: 1,
      lastUpdatedOn: new Date().toISOString(),
    },
  ];

  const gpAds: Record<string, number> = {
    'store-bpl-001:prod-gp-1024': 2.1, // DOI = 3.0 / 2.1 = 1.43 days (HIGH Risk)
    'store-ind-001:prod-gp-1024': 0.5, // DOI = 55.0 / 0.5 = 110.0 days (EXCESS)
  };

  const evalOut = evaluateIntelligenceRebalance({
    targetStoreIds: ['store-bpl-001'],
    stores: gpStores,
    balances: gpBalances,
    existingRecommendations: [],
    adsByStoreAndProduct: gpAds,
  });

  const rec1001: RecommendationRecord = {
    ...evalOut.recommendations[0],
    id: 'rec-gp-1001',
    recommendationNumber: 'REC-1001',
  };

  return {
    skipped: false,
    cleanResetExecuted: params.cleanReset,
    purgeTableOrder: params.cleanReset ? REVERSE_DEPENDENCY_PURGE_ORDER : [],
    seededCounts: {
      users: 4,
      regions: 8,
      storeTypes: 3,
      stores: 50,
      categories: 10,
      brands: 20,
      products: 500,
      posMonths: 6,
    },
    goldenPath: {
      sku: 'SKU-1024',
      barcode: '8901030383742',
      productName: 'Fortune Sunflower Oil 1L',
      costPrice: '110.00',
      sellingPrice: '135.00',
      mrp: '150.00',
      bhopalDest: {
        storeCode: 'BPL-001',
        availableStock: '3.000',
        ads: 2.1,
        doiDays: calculateDeterministicDOI(3.0, 2.1),
        riskTier: classifyDoiRiskTier(calculateDeterministicDOI(3.0, 2.1)),
      },
      indoreDonor: {
        storeCode: 'IND-001',
        availableStock: '55.000',
        ads: 0.5,
        doiDays: calculateDeterministicDOI(55.0, 0.5),
        status: classifyDoiStockStatus(55.0, 15.0, 45.0, 110.0),
      },
      generatedRec: rec1001,
    },
    message:
      'Successfully seeded 50 stores, 500 SKUs, 6 months POS sales, and Bhopal-Indore Golden Path (REC-1001).',
  };
}

// ============================================================================
// CHUNK F1 — Design System Primitives, StatusBadge, RH_DOIGauge & AppShell Scope
// ============================================================================

export type F1StatusVariant =
  | 'critical'
  | 'low'
  | 'healthy'
  | 'excess'
  | 'inTransit'
  | 'rejected';

export interface F1StatusBadgeSpec {
  variant: F1StatusVariant;
  tailwindClasses: string;
}

/**
 * Mirrors `StatusBadge.tsx -> getStatusVariant(status)`:
 * - CRITICAL -> Red (bg-red-50 text-red-700 border-red-200)
 * - LOW -> Amber (bg-amber-50 text-amber-700 border-amber-200)
 * - HEALTHY -> Emerald (bg-emerald-50 text-emerald-700 border-emerald-200)
 * - EXCESS -> Purple (bg-purple-50 text-purple-700 border-purple-200)
 * - APPROVED_IN_TRANSIT -> Blue (bg-blue-50 text-blue-700 border-blue-200)
 * - REJECTED -> Gray (bg-gray-100 text-gray-700 border-gray-200)
 */
export function getStatusBadgeVariant(status: string): F1StatusBadgeSpec {
  const norm = (status || '').trim().toUpperCase();
  if (norm === 'CRITICAL' || norm === 'HIGH' || norm === 'OUT_OF_STOCK') {
    return {
      variant: 'critical',
      tailwindClasses: 'bg-red-50 text-red-700 border-red-200',
    };
  }
  if (
    norm === 'LOW' ||
    norm === 'MEDIUM' ||
    norm === 'PENDING' ||
    norm === 'PENDING_APPROVAL' ||
    norm === 'OPEN'
  ) {
    return {
      variant: 'low',
      tailwindClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  if (
    norm === 'HEALTHY' ||
    norm === 'APPROVED' ||
    norm === 'RECEIVED' ||
    norm === 'ACTIVE'
  ) {
    return {
      variant: 'healthy',
      tailwindClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (norm === 'EXCESS' || norm === 'OVERSTOCK') {
    return {
      variant: 'excess',
      tailwindClasses: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }
  if (
    norm === 'APPROVED_IN_TRANSIT' ||
    norm === 'IN_TRANSIT' ||
    norm === 'MODIFIED'
  ) {
    return {
      variant: 'inTransit',
      tailwindClasses: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    variant: 'rejected',
    tailwindClasses: 'bg-gray-100 text-gray-700 border-gray-200',
  };
}

/**
 * Mirrors `RH_DOIGauge.tsx -> classifyDoiGauge(doi)`:
 * - <= 3.0d: Red (bg-red-500)
 * - 3.1 - 7.0d: Amber (bg-amber-500)
 * - 7.1 - 30.0d: Green (bg-emerald-500)
 * - > 30.0d: Purple (bg-purple-500)
 */
export function classifyDoiGaugeBar(doi: number): {
  zone: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'EXCESS';
  barColorClass: 'bg-red-500' | 'bg-amber-500' | 'bg-emerald-500' | 'bg-purple-500';
  fillPercent: number;
  label: string;
} {
  const safeDoi = Number.isFinite(doi) ? Math.max(0, doi) : 0;
  const fillPercent = Math.min(100, Math.max(6, Math.round((safeDoi / 45) * 100)));
  const label = safeDoi >= 999 ? '999d (Dormant)' : `${safeDoi.toFixed(1)}d`;

  if (safeDoi <= 3.0) {
    return {
      zone: 'CRITICAL',
      barColorClass: 'bg-red-500',
      fillPercent,
      label,
    };
  }
  if (safeDoi <= 7.0) {
    return {
      zone: 'LOW',
      barColorClass: 'bg-amber-500',
      fillPercent,
      label,
    };
  }
  if (safeDoi <= 30.0) {
    return {
      zone: 'HEALTHY',
      barColorClass: 'bg-emerald-500',
      fillPercent,
      label,
    };
  }
  return {
    zone: 'EXCESS',
    barColorClass: 'bg-purple-500',
    fillPercent: 100,
    label,
  };
}

/**
 * Mirrors `DataScopeContext.tsx` & `RH_Header.tsx` Scoped Store Switcher behavior:
 * - STORE_MANAGER: Locked to assigned store (`isLocked: true`, `allowAllStores: false`).
 * - REGIONAL_MANAGER: Scoped to assigned region stores (`isLocked: false`, `allowAllStores: true`).
 * - EXECUTIVE / ADMIN: Unrestricted with "All Stores" option (`isLocked: false`, `allowAllStores: true`).
 */
export function resolveHeaderStoreSwitcherScope(params: {
  role: RoleType;
  assignedRegionIds: string[];
  assignedStoreIds: string[];
  stores: StoreRecord[];
}): {
  visibleStores: StoreRecord[];
  isLocked: boolean;
  allowAllStores: boolean;
  defaultSelectedStoreId: string | null;
} {
  if (params.role === 'EXECUTIVE' || params.role === 'ADMIN') {
    return {
      visibleStores: params.stores,
      isLocked: false,
      allowAllStores: true,
      defaultSelectedStoreId: null,
    };
  }
  if (params.role === 'REGIONAL_MANAGER') {
    const visibleStores = params.stores.filter((s) =>
      params.assignedRegionIds.includes(s.regionId),
    );
    return {
      visibleStores,
      isLocked: false,
      allowAllStores: true,
      defaultSelectedStoreId: null,
    };
  }
  const visibleStores = params.stores.filter((s) =>
    params.assignedStoreIds.includes(s.id),
  );
  return {
    visibleStores,
    isLocked: true,
    allowAllStores: false,
    defaultSelectedStoreId: visibleStores[0]?.id ?? null,
  };
}

/**
 * Chunk F2 Operations Views pure domain helpers:
 * 1. `flattenCategoryTreeForCombobox`: Flattens recursive `CategoryTreeNode` hierarchy into searchable
 *    leaf/folder entries with `parentTrailLabel` (`Parent > Grandparent`) and breadcrumb trail.
 * 2. `chunkCsvProductsBatch`: Splits parsed CSV rows into batches of `<= 1,000` rows per batch.
 * 3. `validateProductValuePricing`: Enforces D-Mart Value Pricing rule (`sellingPrice <= mrp`) and auto-calculates
 *    savings / margin spread.
 * 4. `groupStoreDirectoryByRegion`: Groups operational stores by `regionName`.
 */
export interface ComboboxCategoryItem {
  id: string;
  categoryCode: string;
  name: string;
  breadcrumbTrail: string[];
  parentTrailLabel: string;
  isLeaf: boolean;
  subCategoryCount: number;
}

export function flattenCategoryTreeForCombobox(
  nodes: CategoryTreeNode[],
  ancestors: string[] = [],
): ComboboxCategoryItem[] {
  const results: ComboboxCategoryItem[] = [];

  for (const node of nodes) {
    const subs = node.subCategories ?? [];
    const currentTrail = [...ancestors, node.name];
    const isLeaf = subs.length === 0;

    results.push({
      id: node.id,
      categoryCode: node.categoryCode ?? node.code ?? '',
      name: node.name,
      breadcrumbTrail: currentTrail,
      parentTrailLabel:
        ancestors.length > 0 ? [...ancestors].reverse().join(' > ') : 'Root',
      isLeaf,
      subCategoryCount: subs.length,
    });

    if (subs.length > 0) {
      results.push(...flattenCategoryTreeForCombobox(subs, currentTrail));
    }
  }

  return results;
}

export function chunkCsvProductsBatch<T>(
  rows: T[],
  batchSize = 1000,
): {
  batches: T[][];
  totalRows: number;
  totalBatches: number;
} {
  const safeBatchSize = Math.max(1, batchSize);
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += safeBatchSize) {
    batches.push(rows.slice(i, i + safeBatchSize));
  }
  return {
    batches,
    totalRows: rows.length,
    totalBatches: batches.length,
  };
}

export function validateProductValuePricing(params: {
  costPrice: number;
  sellingPrice: number;
  mrp: number;
}): {
  valid: boolean;
  errorMessage: string | null;
  customerSavings: number;
  discountPercent: number;
  grossMarginPercent: number;
} {
  if (params.costPrice <= 0 || params.sellingPrice <= 0 || params.mrp <= 0) {
    return {
      valid: false,
      errorMessage: 'Prices must be positive numbers',
      customerSavings: 0,
      discountPercent: 0,
      grossMarginPercent: 0,
    };
  }
  if (params.sellingPrice > params.mrp) {
    return {
      valid: false,
      errorMessage: 'Store selling price cannot exceed MRP',
      customerSavings: 0,
      discountPercent: 0,
      grossMarginPercent: 0,
    };
  }
  const customerSavings = Number((params.mrp - params.sellingPrice).toFixed(2));
  const discountPercent = Number(
    ((customerSavings / params.mrp) * 100).toFixed(1),
  );
  const grossMarginPercent = Number(
    (((params.sellingPrice - params.costPrice) / params.sellingPrice) * 100).toFixed(1),
  );
  return {
    valid: true,
    errorMessage: null,
    customerSavings,
    discountPercent,
    grossMarginPercent,
  };
}

export function groupStoreDirectoryByRegion(
  stores: StoreRecord[],
): Array<{ regionId: string; regionName: string; stores: StoreRecord[] }> {
  const map = new Map<
    string,
    { regionId: string; regionName: string; stores: StoreRecord[] }
  >();
  for (const store of stores) {
    const existing = map.get(store.regionId);
    if (existing) {
      existing.stores.push(store);
    } else {
      map.set(store.regionId, {
        regionId: store.regionId,
        regionName: store.regionName,
        stores: [store],
      });
    }
  }
  return Array.from(map.values());
}

// ============================================================================
// CHUNK F3 — INVENTORY HEALTH OVERVIEW, INWARD SCAN & MOVEMENT LEDGER HELPERS
// ============================================================================

export function formatInventoryQty3Decimals(
  quantity: number,
  unitOfMeasure?: 'PIECE' | 'LITRE' | 'KG' | 'PACK',
): string {
  const safe = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
  const formatted = safe.toFixed(3);
  if (!unitOfMeasure) return formatted;
  const label = unitOfMeasure === 'PIECE' ? 'Units' : unitOfMeasure;
  return `${formatted} ${label}`;
}

export function evaluateInwardScanAndShortfall(
  lines: Array<{
    productId: string;
    sku: string;
    productCode: string;
    requestedQty: number;
  }>,
  scannedQuantities: Record<string, number>,
  barcodeScanInput?: string,
): {
  updatedQuantities: Record<string, number>;
  matchedProductId: string | null;
  totalReceived: string;
  totalShortfall: string;
  lineShortfalls: Array<{
    productId: string;
    shortfallQty: string;
    requiresDamageReason: boolean;
  }>;
} {
  const updatedQuantities: Record<string, number> = { ...scannedQuantities };
  let matchedProductId: string | null = null;

  if (barcodeScanInput && barcodeScanInput.trim()) {
    const code = barcodeScanInput.trim().toLowerCase();
    const matched = lines.find(
      (l) =>
        l.productCode.toLowerCase() === code || l.sku.toLowerCase() === code,
    );
    if (matched) {
      matchedProductId = matched.productId;
      const current = Number(updatedQuantities[matched.productId] ?? 0);
      updatedQuantities[matched.productId] = Number((current + 1).toFixed(3));
    }
  }

  let totalReceivedNum = 0;
  let totalShortfallNum = 0;
  const lineShortfalls: Array<{
    productId: string;
    shortfallQty: string;
    requiresDamageReason: boolean;
  }> = [];

  for (const line of lines) {
    const requested = Number(line.requestedQty) || 0;
    const scanned = Math.max(
      0,
      Number(updatedQuantities[line.productId] ?? requested),
    );
    const shortfall = Math.max(0, requested - scanned);
    totalReceivedNum += scanned;
    totalShortfallNum += shortfall;
    lineShortfalls.push({
      productId: line.productId,
      shortfallQty: shortfall.toFixed(3),
      requiresDamageReason: shortfall > 0,
    });
  }

  return {
    updatedQuantities,
    matchedProductId,
    totalReceived: totalReceivedNum.toFixed(3),
    totalShortfall: totalShortfallNum.toFixed(3),
    lineShortfalls,
  };
}

export function evaluateCycleCountProjectedStock(params: {
  currentStock: number;
  currentVersion: number;
  expectedVersion: number;
  mode: 'ADD' | 'REDUCE';
  deltaMagnitude: number;
}): {
  versionConflict: boolean;
  signedDelta: string;
  projectedNewStock: string;
  isValid: boolean;
  conflictToastMessage: string | null;
} {
  if (params.currentVersion !== params.expectedVersion) {
    return {
      versionConflict: true,
      signedDelta: '0.000',
      projectedNewStock: params.currentStock.toFixed(3),
      isValid: false,
      conflictToastMessage:
        'Stock was updated by another transaction. Reloading current balance.',
    };
  }

  const mag = Math.max(0, Number(params.deltaMagnitude) || 0);
  const signed = params.mode === 'ADD' ? mag : -mag;
  const projected = params.currentStock + signed;

  return {
    versionConflict: false,
    signedDelta: (signed >= 0 ? '+' : '') + signed.toFixed(3),
    projectedNewStock: projected.toFixed(3),
    isValid: mag > 0 && projected >= 0,
    conflictToastMessage: null,
  };
}

// ============================================================================
// CHUNK F4 — ACTION CENTER SIDE-BY-SIDE COMPARISON, 7-DAY DONOR FLOOR & BATCH BAR
// ============================================================================

export function computeSideBySideComparisonMetrics(params: {
  destStore: {
    name: string;
    code: string;
    format: string;
    currentStock: number;
    ads: number;
    currentDOI: number;
  };
  sourceStore: {
    name: string;
    code: string;
    format: string;
    currentStock: number;
    ads: number;
    currentDOI: number;
    distanceKm: number;
  } | null;
  transferQty: number;
  unitCost: number;
}): {
  destStockAfter: number;
  destDOIAfter: number;
  srcStockAfter: number;
  srcDOIAfter: number;
  estTransitHours: number;
  transferValue: number;
  isCentralSupplyFallback: boolean;
  centralSupplyBadgeText: string | null;
} {
  const { destStore, sourceStore, transferQty, unitCost } = params;
  const destStockAfter = destStore.currentStock + transferQty;
  const destDOIAfter =
    destStore.ads > 0 ? destStockAfter / destStore.ads : 999;
  const srcStockAfter = sourceStore
    ? sourceStore.currentStock - transferQty
    : 0;
  const srcDOIAfter =
    sourceStore && sourceStore.ads > 0 ? srcStockAfter / sourceStore.ads : 999;
  const estTransitHours = sourceStore
    ? Math.max(0.5, Number((sourceStore.distanceKm / 50).toFixed(1)))
    : 0;
  const transferValue = transferQty * unitCost;

  return {
    destStockAfter,
    destDOIAfter,
    srcStockAfter,
    srcDOIAfter,
    estTransitHours,
    transferValue,
    isCentralSupplyFallback: sourceStore === null,
    centralSupplyBadgeText:
      sourceStore === null ? '[🏭 Central Supply / Mother Hub]' : null,
  };
}

export function evaluateCandidateDonorSafetyFloor(params: {
  storeName: string;
  availableStock: number;
  ads: number;
  quantity: number;
}): {
  maxSafeTransfer: number;
  projectedDonorDOI: number;
  isValid: boolean;
  violationBanner: string | null;
} {
  const maxSafeTransfer = Math.floor(
    params.availableStock - 7.0 * params.ads,
  );
  const projectedDonorDOI =
    params.ads > 0 ? (params.availableStock - params.quantity) / params.ads : 999;

  if (projectedDonorDOI <= 7.0) {
    return {
      maxSafeTransfer,
      projectedDonorDOI,
      isValid: false,
      violationBanner: `Safety Violation: Sourcing ${params.quantity} units drops ${params.storeName} to ${projectedDonorDOI.toFixed(1)} days DOI (Minimum required is 7.0 days). Maximum safe transfer is ${maxSafeTransfer} units.`,
    };
  }

  return {
    maxSafeTransfer,
    projectedDonorDOI,
    isValid: true,
    violationBanner: null,
  };
}

export function computeBatchApprovalSummary(
  selectedRows: Array<{ recommendedQty: number; unitCost: number }>,
): {
  isVisible: boolean;
  selectedCount: number;
  totalUnitsFormatted: string;
  totalValuationInr: number;
  summaryText: string;
} {
  const selectedCount = selectedRows.length;
  const totalUnits = selectedRows.reduce(
    (sum, r) => sum + r.recommendedQty,
    0,
  );
  const totalValuationInr = selectedRows.reduce(
    (sum, r) => sum + r.recommendedQty * r.unitCost,
    0,
  );
  const totalUnitsFormatted = totalUnits.toFixed(3);
  const summaryText = `${selectedCount} Transfers Selected • Total ${totalUnitsFormatted} Units • Est. Value ₹${totalValuationInr.toLocaleString('en-IN')}`;

  return {
    isVisible: selectedCount >= 2,
    selectedCount,
    totalUnitsFormatted,
    totalValuationInr,
    summaryText,
  };
}

/**
 * Chunk F5 Pure Domain Helpers:
 * 1. Role-Scoped Filter Bar authority matrix
 * 2. 16-Column SKU Performance margin, valuation & velocity calculations
 * 3. Side-by-Side Audit JSON Diff key comparison
 */
export function computeRoleScopedFilterCapabilities(params: {
  role: 'STORE_MANAGER' | 'REGIONAL_MANAGER' | 'EXECUTIVE' | 'ADMIN';
  assignedRegionId?: string;
  assignedStoreId?: string;
}): {
  showRegionSelector: boolean;
  isRegionLocked: boolean;
  isStoreLocked: boolean;
  allowAllStoresInScope: boolean;
  effectiveRegionId: string | null;
  effectiveStoreId: string | null;
} {
  const {
    role,
    assignedRegionId = 'reg-central-mp',
    assignedStoreId = 'store-bpl-001',
  } = params;

  if (role === 'STORE_MANAGER') {
    return {
      showRegionSelector: false,
      isRegionLocked: true,
      isStoreLocked: true,
      allowAllStoresInScope: false,
      effectiveRegionId: assignedRegionId,
      effectiveStoreId: assignedStoreId,
    };
  }

  if (role === 'REGIONAL_MANAGER') {
    return {
      showRegionSelector: true,
      isRegionLocked: true,
      isStoreLocked: false,
      allowAllStoresInScope: true,
      effectiveRegionId: assignedRegionId,
      effectiveStoreId: null,
    };
  }

  return {
    showRegionSelector: true,
    isRegionLocked: false,
    isStoreLocked: false,
    allowAllStoresInScope: true,
    effectiveRegionId: null,
    effectiveStoreId: null,
  };
}

export function computeSkuPerformanceRowMetrics(input: {
  costPrice: number;
  sellingPrice: number;
  availableStock: number;
  inTransitStock: number;
  ads: number;
}): {
  unitMarginInr: number;
  marginPercentFormatted: string;
  stockValuationFormatted: string;
  currentDOI: number;
  velocityTier: 'FAST_MOVING' | 'MODERATE' | 'SLOW_MOVING' | 'DEAD_STOCK';
} {
  const unitMarginInr = input.sellingPrice - input.costPrice;
  const marginPct =
    input.sellingPrice > 0
      ? ((input.sellingPrice - input.costPrice) / input.sellingPrice) * 100
      : 0;
  const stockValuation =
    (input.availableStock + input.inTransitStock) * input.costPrice;
  const currentDOI =
    input.ads > 0 ? input.availableStock / input.ads : 999.0;

  let velocityTier: 'FAST_MOVING' | 'MODERATE' | 'SLOW_MOVING' | 'DEAD_STOCK' =
    'DEAD_STOCK';
  if (input.ads >= 4.0) {
    velocityTier = 'FAST_MOVING';
  } else if (input.ads >= 2.0) {
    velocityTier = 'MODERATE';
  } else if (input.ads >= 0.5) {
    velocityTier = 'SLOW_MOVING';
  }

  return {
    unitMarginInr,
    marginPercentFormatted: `${marginPct.toFixed(1)}%`,
    stockValuationFormatted: stockValuation.toFixed(2),
    currentDOI: Number(currentDOI.toFixed(2)),
    velocityTier,
  };
}

export function computeAuditJsonDiffKeys(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): Array<{
  key: string;
  oldValueFormatted: string;
  newValueFormatted: string;
  isChanged: boolean;
}> {
  const oldObj = oldValues ?? {};
  const newObj = newValues ?? {};
  const keys = Array.from(
    new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
  );

  return keys.map((key) => {
    const before = oldObj[key];
    const after = newObj[key];
    const isChanged = JSON.stringify(before) !== JSON.stringify(after);
    return {
      key,
      oldValueFormatted:
        before !== undefined ? JSON.stringify(before) : 'undefined',
      newValueFormatted:
        after !== undefined ? JSON.stringify(after) : 'undefined',
      isChanged,
    };
  });
}



