import { useAuth } from "@clerk/react";
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Permission } from "../../types/permissions";
import { usePermission } from "../../hooks/usePermission";
import { useNativeRBAC } from "./NativeRBACProvider";
import AccessDenied from "./AccessDenied";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const { isLoaded, userId } = useAuth();
  const { activeOrganization, isLoading: rbacLoading } = useNativeRBAC();
  const { hasPermission, isLoading: permLoading } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoaded) {
      if (!userId) {
        // User is not signed in, redirect to login
        navigate("/login", { replace: true, state: { from: location } });
      } else if (!rbacLoading && !activeOrganization && location.pathname !== "/org-select") {
        // User is signed in but has no active organization, force org selection
        navigate("/org-select", { replace: true });
      }
    }
  }, [isLoaded, userId, activeOrganization, rbacLoading, navigate, location]);

  if (!isLoaded || rbacLoading || permLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If we require a specific permission and the user doesn't have it
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
