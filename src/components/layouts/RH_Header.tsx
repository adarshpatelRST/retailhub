import * as React from "react";
import { KeyRound, LogOut, Menu, Store, User, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, getInitials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DemoControlWidget } from "@/components/dashboard/DemoControlWidget";
import { resetDemoDatabase } from "@/mock/mockDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordModal } from "@/components/modals/ChangePasswordModal";

export interface RH_HeaderProps {
  onOpenMobileMenu: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export const RH_Header: React.FC<RH_HeaderProps> = ({
  onOpenMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

  const handleResetDemoData = () => {
    resetDemoDatabase();
    queryClient.invalidateQueries();
    toast.success("Demo database reset to clean enterprise baseline!");
  };

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
              RepleniQ
              <sup className="ml-0.5 text-[8px] font-semibold tracking-normal leading-none relative -top-[0.55em] text-muted-foreground">
                TM
              </sup>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Powered by RustyStick Technologies LLP
            </div>
          </div>
        </div>
      </div>

      {/* Right: Reset Data, User Persona Avatar & Menu */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* 1-Click Reset Demo Data Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetDemoData}
          className="h-8 gap-1 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          title="Reset database to initial pristine seed"
        >
          <RotateCcw className="size-3.5 text-slate-500" />
          <span className="hidden md:inline">Reset Demo Data</span>
        </Button>

        {import.meta.env.VITE_ENABLE_DEMO_WIDGET === "true" && (
          <DemoControlWidget />
        )}

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
                  onClick={handleResetDemoData}
                  className="cursor-pointer text-xs flex items-center gap-2 text-slate-700"
                >
                  <RotateCcw className="size-4 text-slate-500" />
                  <span>Reset Demo Data</span>
                </DropdownMenuItem>
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
