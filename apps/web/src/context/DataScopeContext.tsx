import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export interface ScopedStoreOption {
  id: string;
  storeCode: string;
  name: string;
  city: string;
  regionId: string;
  regionName: string;
}

export interface DataScopeContextValue {
  availableStores: ScopedStoreOption[];
  selectedStoreId: string | null;
  selectedRegionId: string | null;
  isStoreLocked: boolean;
  allowAllStoresOption: boolean;
  setSelectedStoreId: (storeId: string | null) => void;
  setSelectedRegionId: (regionId: string | null) => void;
}

const DEFAULT_STORES: ScopedStoreOption[] = [
  {
    id: "store-bpl-001",
    storeCode: "BPL-001",
    name: "Bhopal MP Nagar Store",
    city: "Bhopal",
    regionId: "reg-central-mp",
    regionName: "Central MP",
  },
  {
    id: "store-ind-001",
    storeCode: "IND-001",
    name: "Indore Vijay Nagar Store",
    city: "Indore",
    regionId: "reg-central-mp",
    regionName: "Central MP",
  },
  {
    id: "store-mum-001",
    storeCode: "DM-MUM-001",
    name: "Powai High-Velocity Hypermarket",
    city: "Mumbai",
    regionId: "reg-west-mh",
    regionName: "Maharashtra West",
  },
  {
    id: "store-mum-002",
    storeCode: "JM-MUM-002",
    name: "Andheri East Quick-Fulfilment Hub",
    city: "Mumbai",
    regionId: "reg-west-mh",
    regionName: "Maharashtra West",
  },
  {
    id: "store-pun-003",
    storeCode: "DM-PUN-003",
    name: "Hinjewadi Supercenter",
    city: "Pune",
    regionId: "reg-west-mh",
    regionName: "Maharashtra West",
  },
  {
    id: "store-blr-006",
    storeCode: "JM-BLR-005",
    name: "Whitefield Omni-Channel Center",
    city: "Bengaluru",
    regionId: "reg-south-ka",
    regionName: "Karnataka South",
  },
];

const DataScopeContext = createContext<DataScopeContextValue | undefined>(
  undefined,
);

export const DataScopeProvider: React.FC<{
  children: React.ReactNode;
  stores?: ScopedStoreOption[];
}> = ({ children, stores = DEFAULT_STORES }) => {
  const { user } = useAuth();
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(
    null,
  );
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const availableStores = useMemo(() => {
    if (!user) return [];
    if (user.role === "EXECUTIVE" || user.role === "ADMIN") {
      return stores;
    }
    if (user.role === "REGIONAL_MANAGER") {
      return stores.filter((s) => user.assignedRegionIds.includes(s.regionId));
    }
    return stores.filter((s) => user.assignedStoreIds.includes(s.id));
  }, [user, stores]);

  const isStoreLocked = user?.role === "STORE_MANAGER";
  const allowAllStoresOption =
    user?.role === "EXECUTIVE" ||
    user?.role === "ADMIN" ||
    user?.role === "REGIONAL_MANAGER";

  useEffect(() => {
    if (!user) {
      setSelectedStoreIdState(null);
      return;
    }
    if (user.role === "STORE_MANAGER") {
      setSelectedStoreIdState(user.assignedStoreIds[0] ?? null);
    } else if (
      selectedStoreId &&
      !availableStores.some((s) => s.id === selectedStoreId)
    ) {
      setSelectedStoreIdState(null);
    }
  }, [user, availableStores, selectedStoreId]);

  const setSelectedStoreId = useCallback(
    (storeId: string | null) => {
      if (isStoreLocked) return;
      setSelectedStoreIdState(storeId === "ALL_STORES" ? null : storeId);
    },
    [isStoreLocked],
  );

  const value = useMemo<DataScopeContextValue>(
    () => ({
      availableStores,
      selectedStoreId,
      selectedRegionId,
      isStoreLocked,
      allowAllStoresOption,
      setSelectedStoreId,
      setSelectedRegionId,
    }),
    [
      availableStores,
      selectedStoreId,
      selectedRegionId,
      isStoreLocked,
      allowAllStoresOption,
      setSelectedStoreId,
    ],
  );

  return (
    <DataScopeContext.Provider value={value}>
      {children}
    </DataScopeContext.Provider>
  );
};

export function useDataScope(): DataScopeContextValue {
  const context = useContext(DataScopeContext);
  if (!context) {
    throw new Error("useDataScope must be used within a DataScopeProvider.");
  }
  return context;
}
