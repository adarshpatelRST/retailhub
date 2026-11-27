import * as React from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Package,
  Shield,
  ShieldCheck,
  Sliders,
  Tags,
  TrendingUp,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";

export interface NavItemDefinition {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  allowedRoles?: string[];
}

export interface NavGroupDefinition {
  groupLabel: string;
  items: NavItemDefinition[];
}

export const RETAILHUB_NAV_GROUPS: NavGroupDefinition[] = [
  {
    groupLabel: "Dashboards",
    items: [
      {
        id: "executive-dashboard",
        label: "Dashboard",
        href: "/dashboard/executive",
        icon: <BarChart3 className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER"],
      },
      {
        id: "store-dashboard",
        label: "Store Operations",
        href: "/dashboard/store",
        icon: <Activity className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["REGIONAL_MANAGER", "STORE_MANAGER"],
      },
    ],
  },
  {
    groupLabel: "Operations",
    items: [
      {
        id: "products",
        label: "Products",
        href: "/operations/products",
        icon: <Package className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE"],
      },
      {
        id: "stores",
        label: "Stores",
        href: "/operations/stores",
        icon: <Building2 className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/operations/inventory",
        icon: <Boxes className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
      {
        id: "transfers",
        label: "Stock Transfers",
        href: "/operations/transfers",
        icon: <Truck className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
      {
        id: "sales",
        label: "Sales",
        href: "/operations/sales",
        icon: <TrendingUp className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
    ],
  },
  {
    groupLabel: "Intelligence",
    items: [
      {
        id: "action-center",
        label: "Action Center",
        href: "/intelligence/action-center",
        icon: <ClipboardCheck className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
    ],
  },
  {
    groupLabel: "Reports",
    items: [
      {
        id: "reports",
        label: "Reports",
        href: "/reports",
        icon: <FileSpreadsheet className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
    ],
  },
  {
    groupLabel: "Administration",
    items: [
      {
        id: "configurations",
        label: "Configurations",
        href: "/admin/configurations",
        icon: <Sliders className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE"],
      },
      {
        id: "categories-brands",
        label: "Categories & Brands",
        href: "/admin/categories-brands",
        icon: <Tags className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN"],
      },
      {
        id: "users-roles",
        label: "Users & Roles",
        href: "/admin/users-roles",
        icon: <Shield className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN"],
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: <ShieldCheck className="h-4 w-4 size-4 shrink-0" />,
        allowedRoles: ["ADMIN", "EXECUTIVE", "REGIONAL_MANAGER", "STORE_MANAGER"],
      },
    ],
  },
];

export interface RH_SideNavigationProps {
  activeNavId: string;
  onSelectNav: (navId: string, href: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export const RH_SideNavigation: React.FC<RH_SideNavigationProps> = ({
  activeNavId,
  onSelectNav,
  collapsed = false,
  onToggleCollapse,
  mobileOpen,
  onMobileOpenChange,
}) => {
  const { user } = useAuth();

  // Filter items by RBAC
  const filteredGroups = React.useMemo(() => {
    return RETAILHUB_NAV_GROUPS.map((group) => {
      const items = group.items.filter((item) => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
        if (!user) return false;
        return item.allowedRoles.includes(user.role);
      });
      return {
        ...group,
        items,
      };
    }).filter((group) => group.items.length > 0);
  }, [user]);

  const renderGroups = (isCollapsed: boolean, closeOnSelect: boolean) => (
    <nav
      aria-label="RepleniQ Domain Navigation"
      className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
    >
      {filteredGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.groupLabel}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.id === activeNavId;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => {
                    onSelectNav(item.id, item.href);
                    if (closeOnSelect) {
                      onMobileOpenChange(false);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-slate-900",
                    isCollapsed && "justify-center px-2",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold shrink-0",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col border-r border-slate-200 bg-white h-full overflow-y-auto transition-all duration-200 shrink-0",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        {renderGroups(collapsed, false)}
      </aside>

      {/* Mobile Drawer (< 1024px) */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-r border-slate-200 shadow-2xl">
          <SheetHeader className="border-b border-slate-200 px-4 py-3.5 text-left bg-white">
            <SheetTitle className="text-sm font-bold text-slate-900">
              RepleniQ™ Navigation
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto bg-white">
            {renderGroups(false, true)}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
