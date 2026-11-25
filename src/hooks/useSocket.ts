import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";

export interface StockUpdatedEventPayload {
  storeId: string;
  storeCode?: string;
  productId: string;
  sku?: string;
  newAvailableQty: number;
  currentDOI?: number;
  stockStatus?: string;
  correlationId?: string;
}

export interface RecommendationSocketPayload {
  id: string;
  recNumber: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  productName?: string;
  sku?: string;
  toStoreName?: string;
  fromStoreName?: string | null;
  recommendedQty?: number;
}

export interface UseSocketReturn {
  isConnected: boolean;
  unreadNotificationsCount: number;
  clearUnreadNotifications: () => void;
  lastEventAt: string | null;
}

/**
 * Real-time Socket.io client hook with JWT handshake authentication,
 * scoped room synchronization (`store:{id}`, `region:{id}`, `role:EXECUTIVE`),
 * automatic TanStack Query cache invalidations, and reconnection catch-up.
 */
export function useSocket(): UseSocketReturn {
  const { token, user, isAuthenticated } = useAuth();
  const { selectedStoreId, selectedRegionId } = useDataScope();
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const clearUnreadNotifications = useCallback(() => {
    setUnreadNotificationsCount(0);
  }, []);

  useEffect(() => {
    // In mock demo mode, skip connecting to live backend WebSocket
    if (import.meta.env.VITE_USE_REAL_BACKEND !== "true") {
      setIsConnected(true);
      return;
    }

    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setLastEventAt(new Date().toISOString());

      // Emit client_reconnected so server syncs rooms and client refreshes active queries
      socket.emit("client_reconnected", {
        userId: user?.id,
        role: user?.role,
        storeId: selectedStoreId,
        regionId: selectedRegionId,
        timestamp: new Date().toISOString(),
      });

      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("STOCK_UPDATED", (payload: StockUpdatedEventPayload) => {
      setLastEventAt(new Date().toISOString());
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });

      if (payload.stockStatus === "CRITICAL") {
        toast.warning(
          `Critical Stock Alert: ${payload.sku ?? payload.productId} at ${
            payload.storeCode ?? payload.storeId
          } dropped to ${Number(payload.newAvailableQty).toFixed(3)} units (${Number(
            payload.currentDOI ?? 0,
          ).toFixed(2)}d DOI).`,
        );
      }
    });

    socket.on("REC_CREATED", (payload: RecommendationSocketPayload) => {
      setLastEventAt(new Date().toISOString());
      setUnreadNotificationsCount((prev) => prev + 1);

      toast.info(
        `New ${payload.priority} Rebalance Recommendation ${payload.recNumber}: ${
          payload.productName ?? payload.sku ?? "SKU"
        } ➔ ${payload.toStoreName ?? "Destination Store"}`,
      );

      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    });

    socket.on("REC_UPDATED", (payload: RecommendationSocketPayload) => {
      setLastEventAt(new Date().toISOString());
      toast.success(
        `Recommendation ${payload.recNumber} updated to ${payload.status}.`,
      );

      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("STOCK_UPDATED");
      socket.off("REC_CREATED");
      socket.off("REC_UPDATED");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    isAuthenticated,
    token,
    user?.id,
    user?.role,
    selectedStoreId,
    selectedRegionId,
    queryClient,
  ]);

  return {
    isConnected,
    unreadNotificationsCount,
    clearUnreadNotifications,
    lastEventAt,
  };
}
