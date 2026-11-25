import * as React from "react";
import { Bell, KeyRound, Lock, LogOut, Menu, Store, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import { Avatar, AvatarFallback, getInitials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { DemoControlWidget } from "@/modules/dashboard/components/DemoControlWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordModal } from "@/modules/auth/components/ChangePasswordModal";

export interface RH_HeaderProps {
  onOpenMobileMenu: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export const RH_Header: React.FC<RH_HeaderProps> = ({
  onOpenMobileMenu,
  unreadNotificationsCount = 3,
  onOpenNotifications,
}) => {
  const { user, switchDemoPersona, logout } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const {
    availableStores,
    selectedStoreId,
    isStoreLocked,
    allowAllStoresOption,
    setSelectedStoreId,
  } = useDataScope();

  const storeItems = React.useMemo<ComboboxItem[]>(() => {
    return availableStores.map((st) => ({
      id: st.id,
      label: `${st.storeCode} — ${st.name}`,
      subLabel: `${st.city} · ${st.regionName}`,
      badgeText: st.storeCode,
    }));
  }, [availableStores]);

  const allStoresOption = React.useMemo(() => {
    if (!allowAllStoresOption) return undefined;
    const scopeLabel =
      user?.role === "REGIONAL_MANAGER"
        ? `All Regional Stores (${availableStores.length})`
        : `All Enterprise Stores (${availableStores.length})`;
    return {
      id: "ALL_STORES",
      label: scopeLabel,
    };
  }, [allowAllStoresOption, user?.role, availableStores.length]);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      {/* Left: Mobile Hamburger + RetailHub Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5 size-5 shrink-0" />
        </Button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
            <Store className="h-4 w-4 size-4 shrink-0" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold tracking-tight text-foreground leading-none">
              RetailHub Enterprise
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              High-Velocity Store &amp; Rebalance OS
            </div>
          </div>
        </div>
      </div>

      {/* Center: Scoped Store Switcher */}
      <div className="flex items-center gap-2">
        <DropSearch
          items={storeItems}
          value={selectedStoreId}
          onChange={setSelectedStoreId}
          allOption={allStoresOption}
          disabled={isStoreLocked}
          placeholder="Select operational store..."
          searchPlaceholder="Search store code or city..."
          width="w-[240px] sm:w-[320px]"
        />
        {isStoreLocked && (
          <span
            title="Store Manager scope is locked to assigned store"
            className="hidden md:inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 shrink-0"
          >
            <Lock className="h-3 w-3 size-3 shrink-0" />
            <span>Locked Scope</span>
          </span>
        )}
      </div>

      {/* Right: Live Notification Bell & User Persona Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {import.meta.env.VITE_ENABLE_DEMO_WIDGET === "true" && (
          <DemoControlWidget />
        )}

        <select
          aria-label="Switch Demo RBAC Persona"
          value={user?.role ?? "EXECUTIVE"}
          onChange={(e) =>
            switchDemoPersona(
              e.target.value as
                | "EXECUTIVE"
                | "REGIONAL_MANAGER"
                | "STORE_MANAGER"
                | "ADMIN",
            )
          }
          className="hidden xl:block h-8 rounded-md border border-input bg-muted/50 px-2 font-mono text-xs text-foreground"
        >
          <option value="EXECUTIVE">Role: EXECUTIVE</option>
          <option value="REGIONAL_MANAGER">Role: REGIONAL_MANAGER</option>
          <option value="STORE_MANAGER">Role: STORE_MANAGER</option>
          <option value="ADMIN">Role: ADMIN</option>
        </select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenNotifications}
          aria-label={`Notifications (${unreadNotificationsCount} unread)`}
          className="relative"
        >
          <Bell className="h-4 w-4 size-4 shrink-0" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white">
              {unreadNotificationsCount}
            </span>
          )}
        </Button>

        {user && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 pl-1 rounded-lg hover:bg-muted/60 p-1 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-semibold text-foreground leading-none">
                      {user.fullName}
                    </div>
                    <div className="mt-1 inline-flex items-center rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground">
                      {user.role}
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-semibold leading-none">{user.fullName}</p>
                    <p className="text-[11px] leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setChangePasswordOpen(true)}
                  className="cursor-pointer text-xs flex items-center gap-2"
                >
                  <KeyRound className="size-4 text-blue-500" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-xs text-rose-600 focus:text-rose-600 flex items-center gap-2"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ChangePasswordModal
              open={changePasswordOpen}
              onOpenChange={setChangePasswordOpen}
            />
          </>
        )}
      </div>
    </header>
  );
};
