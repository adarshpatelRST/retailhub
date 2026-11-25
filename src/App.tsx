import * as React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataScopeProvider } from "@/hooks/useDataScope";
import { useSocket } from "@/hooks/useSocket";
import { AppShell } from "@/components/layouts/AppShell";
import { ProtectedRoute } from "@/components/layouts/ProtectedRoute";

// Page-level route views
import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ExecutiveDashboardPage } from "@/pages/ExecutiveDashboardPage";
import { StoreDashboardPage } from "@/pages/StoreDashboardPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { StoresPage } from "@/pages/StoresPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { TransfersPage } from "@/pages/TransfersPage";
import { ActionCenterPage } from "@/pages/ActionCenterPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SalesPage } from "@/pages/SalesPage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { InventoryRulesPage } from "@/pages/InventoryRulesPage";
import { ConfigurationsPage } from "@/pages/ConfigurationsPage";
import { CategoriesBrandsPage } from "@/pages/CategoriesBrandsPage";
import { AuditLogsPage } from "@/pages/AuditLogsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PATH_TO_NAV_ID: Record<string, string> = {
  "/dashboard/executive": "executive-dashboard",
  "/dashboard/store": "store-dashboard",
  "/operations/products": "products",
  "/operations/stores": "stores",
  "/operations/inventory": "inventory",
  "/operations/transfers": "transfers",
  "/operations/sales": "sales",
  "/intelligence/insights": "automated-insights",
  "/intelligence/action-center": "action-center",
  "/reports/sales": "sales-report",
  "/reports/inventory": "inventory-report",
  "/reports/store-performance": "store-performance",
  "/reports/recommendations": "recommendation-report",
  "/reports/products": "sku-performance-report",
  "/reports/audit": "audit-report",
  "/admin/configurations": "configurations",
  "/admin/inventory-rules": "configurations",
  "/admin/categories-brands": "categories-brands",
  "/admin/users-roles": "users-roles",
  "/admin/audit-logs": "audit-logs",
  "/reports": "reports",
};

const RoutedAppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadNotificationsCount, clearUnreadNotifications } = useSocket();

  const activeNavId = PATH_TO_NAV_ID[location.pathname] ?? "executive-dashboard";

  return (
    <AppShell
      activeNavId={activeNavId}
      unreadNotificationsCount={unreadNotificationsCount}
      onOpenNotifications={() => {
        clearUnreadNotifications();
        navigate("/intelligence/action-center");
      }}
      onNavigate={(_navId, href) => navigate(href)}
    >
      <Routes>
        <Route path="/" element={<RoleDefaultRedirect />} />

        {/* Dashboards */}
        <Route
          path="/dashboard/executive"
          element={
            <ProtectedRoute allowedRoles={["EXECUTIVE", "REGIONAL_MANAGER", "ADMIN"]}>
              <ExecutiveDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/store"
          element={
            <ProtectedRoute allowedRoles={["REGIONAL_MANAGER", "STORE_MANAGER"]}>
              <StoreDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Operations */}
        <Route
          path="/operations/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/stores"
          element={
            <ProtectedRoute>
              <StoresPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/inventory"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/transfers"
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/sales"
          element={
            <ProtectedRoute>
              <SalesPage />
            </ProtectedRoute>
          }
        />

        {/* Intelligence & Action Center */}
        <Route
          path="/intelligence/insights"
          element={
            <ProtectedRoute allowedRoles={["EXECUTIVE", "REGIONAL_MANAGER", "ADMIN"]}>
              <ExecutiveDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/intelligence/action-center"
          element={
            <ProtectedRoute>
              <ActionCenterPage />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports/*"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Administration */}
        <Route
          path="/admin/configurations"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE"]}>
              <ConfigurationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventory-rules"
          element={<Navigate to="/admin/configurations?tab=rules" replace />}
        />
        <Route
          path="/admin/categories-brands"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <CategoriesBrandsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users-roles"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<RoleDefaultRedirect />} />
      </Routes>
    </AppShell>
  );
};

export const RoleDefaultRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "STORE_MANAGER") {
    return <Navigate to="/dashboard/store" replace />;
  }
  if (user.role === "REGIONAL_MANAGER") {
    return <Navigate to="/intelligence/action-center" replace />;
  }
  return <Navigate to="/dashboard/executive" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataScopeProvider>
          <BrowserRouter>
            <Routes>
              {/* Standalone Corporate Login and Password Reset Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Authenticated Workspace */}
              <Route path="/*" element={<RoutedAppShell />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </DataScopeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
