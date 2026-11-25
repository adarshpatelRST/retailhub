import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./useAuth";

import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/store.api";

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

export const DEFAULT_STORES: ScopedStoreOption[] = [
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

const REGION_NAME_MAP: Record<string, string> = {
  "14550def-74a2-48ff-885f-41d69e3beaef": "Malwa Plateau (Indore & Ujjain)",
  "3e21cc87-bb07-43f3-a9d7-d6bc3d786c17": "Delhi NCR & Gurugram",
  "443aa2c8-d418-455c-80b8-d195037b57b0": "Eastern UP (Lucknow & Varanasi)",
  "5f28af41-8788-4e65-b239-2cf5f307741b": "Hyderabad Deccan Corridor",
  "7463c207-a390-4e4a-93f9-1be566e65267": "Bengaluru Metro South",
  "a52fe5d0-190e-4af9-8d27-6e4b1a1e9242": "Central MP (Bhopal & Narmadapuram)",
  "c0a80dcb-bf37-4504-81eb-8fd74e7e41f1": "Pune & Western Maharashtra",
  "cc767979-d7d6-4839-be87-b625d993e989": "Mumbai Metropolitan Region (MMR)",
};

const DataScopeContext = createContext<DataScopeContextValue | undefined>(undefined);

export const DataScopeProvider: React.FC<{
  children: React.ReactNode;
  stores?: ScopedStoreOption[];
}> = ({ children, stores: propStores }) => {
  const { user } = useAuth();
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const { data: dbStores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storeApi.getStores(),
    staleTime: 5 * 60 * 1000,
    enabled: !propStores && !!user,
  });

  const stores = useMemo(() => {
    if (propStores && propStores.length > 0) return propStores;
    if (dbStores && dbStores.length > 0) {
      return dbStores.map((s) => ({
        id: s.id,
        storeCode: s.storeCode,
        name: s.name,
        city: s.city,
        regionId: s.regionId,
        regionName:
          (s as any).regionName && (s as any).regionName !== "Region"
            ? (s as any).regionName
            : s.region?.name && s.region.name !== "Region"
              ? s.region.name
              : REGION_NAME_MAP[s.regionId] || "Operational Region",
      }));
    }
    return DEFAULT_STORES;
  }, [propStores, dbStores]);

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
    } else if (selectedStoreId && !availableStores.some((s) => s.id === selectedStoreId)) {
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
    [availableStores, selectedStoreId, selectedRegionId, isStoreLocked, allowAllStoresOption, setSelectedStoreId],
  );

  return <DataScopeContext.Provider value={value}>{children}</DataScopeContext.Provider>;
};

export function useDataScope(): DataScopeContextValue {
  const context = useContext(DataScopeContext);
  if (!context) {
    throw new Error("useDataScope must be used within a DataScopeProvider.");
  }
  return context;
}
