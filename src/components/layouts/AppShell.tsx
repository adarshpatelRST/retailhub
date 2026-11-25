import * as React from "react";
import { Outlet } from "react-router-dom";
import { PageContainer } from "@/components/ui/DesignSystem";
import { Toaster } from "@/components/ui/sonner";
import { RH_Header } from "./RH_Header";
import { RH_SideNavigation } from "./RH_SideNavigation";

export interface AppShellProps {
  activeNavId?: string;
  onNavigate?: (navId: string, href: string) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeNavId: controlledNavId,
  onNavigate,
  unreadNotificationsCount = 3,
  onOpenNotifications,
  children,
}) => {
  const [internalNavId, setInternalNavId] = React.useState(
    controlledNavId ?? "action-center",
  );
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const activeNavId = controlledNavId ?? internalNavId;

  const handleSelectNav = (navId: string, href: string) => {
    setInternalNavId(navId);
    onNavigate?.(navId, href);
  };

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileMenuOpen((o) => !o);
    } else {
      setSidebarCollapsed((c) => !c);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <RH_Header
        onOpenMobileMenu={handleToggleSidebar}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={onOpenNotifications}
      />

      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        <RH_SideNavigation
          activeNavId={activeNavId}
          onSelectNav={handleSelectNav}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          mobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
        />

        <main className="flex-1 min-w-0 h-full overflow-y-auto bg-slate-50/60">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
