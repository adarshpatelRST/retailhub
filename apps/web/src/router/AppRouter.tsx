import * as React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { ActionCenterListView } from "@/modules/action-center/ActionCenterListView";
import { InventoryRuleConfigView } from "@/modules/administration/InventoryRuleConfigView";
import { UserManagementView } from "@/modules/administration/UserManagementView";
import { LoginView } from "@/modules/auth/LoginView";
import { ForgotPasswordView } from "@/modules/auth/ForgotPasswordView";
import { ExecutiveDashboardView } from "@/modules/dashboard/ExecutiveDashboardView";
import { StoreDashboardView } from "@/modules/dashboard/StoreDashboardView";
import { InventoryOverviewView } from "@/modules/operations/inventory/InventoryOverviewView";
import { TransferShipmentsView } from "@/modules/operations/inventory/TransferShipmentsView";
import { ProductListView } from "@/modules/operations/product/ProductListView";
import { StoreDirectoryView } from "@/modules/operations/store/StoreDirectoryView";
import { AuditReportView } from "@/modules/reports/AuditReportView";
import { InventoryReportView } from "@/modules/reports/InventoryReportView";
import { RecommendationReportView } from "@/modules/reports/RecommendationReportView";
import { SalesReportView } from "@/modules/reports/SalesReportView";
import { SkuPerformanceReportView } from "@/modules/reports/SkuPerformanceReportView";
import { StorePerformanceReportView } from "@/modules/reports/StorePerformanceReportView";
import { ProtectedRoute } from "./ProtectedRoute";

const PATH_TO_NAV_ID: Record<string, string> = {
  "/dashboard/executive": "executive-dashboard",
  "/dashboard/store": "store-dashboard",
  "/operations/products": "products",
  "/operations/stores": "stores",
  "/operations/inventory": "inventory",
  "/operations/transfers": "inventory",
  "/operations/sales": "sales",
  "/intelligence/insights": "automated-insights",
  "/intelligence/action-center": "action-center",
  "/reports/sales": "sales-report",
  "/reports/inventory": "inventory-report",
  "/reports/store-performance": "store-performance",
  "/reports/recommendations": "recommendation-report",
  "/reports/products": "sku-performance-report",
  "/reports/audit": "audit-report",
  "/admin/inventory-rules": "inventory-rules",
  "/admin/users-roles": "users-roles",
};

const RoutedAppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadNotificationsCount, clearUnreadNotifications } = useSocket();

  const activeNavId =
    PATH_TO_NAV_ID[location.pathname] ?? "executive-dashboard";

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
        {/* Default Role-Aware Landing Redirect */}
        <Route path="/" element={<RoleDefaultRedirect />} />

        {/* Dashboards */}
        <Route
          path="/dashboard/executive"
          element={
            <ProtectedRoute
              allowedRoles={["EXECUTIVE", "REGIONAL_MANAGER", "ADMIN"]}
            >
              <ExecutiveDashboardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/store"
          element={
            <ProtectedRoute>
              <StoreDashboardView />
            </ProtectedRoute>
          }
        />

        {/* Operations */}
        <Route
          path="/operations/products"
          element={
            <ProtectedRoute>
              <ProductListView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/stores"
          element={
            <ProtectedRoute>
              <StoreDirectoryView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/inventory"
          element={
            <ProtectedRoute>
              <InventoryOverviewView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/transfers"
          element={
            <ProtectedRoute>
              <TransferShipmentsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/sales"
          element={
            <ProtectedRoute>
              <SalesReportView />
            </ProtectedRoute>
          }
        />

        {/* Intelligence & Action Center */}
        <Route
          path="/intelligence/insights"
          element={
            <ProtectedRoute
              allowedRoles={["EXECUTIVE", "REGIONAL_MANAGER", "ADMIN"]}
            >
              <ExecutiveDashboardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/intelligence/action-center"
          element={
            <ProtectedRoute>
              <ActionCenterListView />
            </ProtectedRoute>
          }
        />

        {/* 6 Role-Scoped Official Reports */}
        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute>
              <SalesReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/inventory"
          element={
            <ProtectedRoute>
              <InventoryReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/store-performance"
          element={
            <ProtectedRoute>
              <StorePerformanceReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/recommendations"
          element={
            <ProtectedRoute>
              <RecommendationReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/products"
          element={
            <ProtectedRoute>
              <SkuPerformanceReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/audit"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE"]}>
              <AuditReportView />
            </ProtectedRoute>
          }
        />

        {/* Administration */}
        <Route
          path="/admin/inventory-rules"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "EXECUTIVE"]}>
              <InventoryRuleConfigView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users-roles"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <UserManagementView />
            </ProtectedRoute>
          }
        />

        {/* Fallback to Default Redirect */}
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

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dedicated Corporate Login and Password Reset Routes */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/forgot-password" element={<ForgotPasswordView />} />

        {/* Authenticated Workspace Shell */}
        <Route path="/*" element={<RoutedAppShell />} />
      </Routes>
    </BrowserRouter>
  );
};
