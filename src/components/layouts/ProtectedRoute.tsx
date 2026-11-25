import * as React from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@shared/schema";

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles = [],
  redirectTo = "/login",
  children,
}) => {
  const { isAuthenticated, user, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    const fallbackPath =
      user.role === "STORE_MANAGER"
        ? "/dashboard/store"
        : user.role === "REGIONAL_MANAGER"
        ? "/intelligence/action-center"
        : "/dashboard/executive";

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900/50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <ShieldAlert className="size-5 shrink-0" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Insufficient Operational Authority
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your active role (<strong className="font-mono">{user.role}</strong>) is
                not authorized to access{" "}
                <code className="font-mono">{location.pathname}</code>. Required
                authority:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {allowedRoles.join(" | ")}
                </span>
                .
              </p>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => navigate(fallbackPath, { replace: true })}
              className="w-full text-xs font-semibold"
            >
              Return to Authorized Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
