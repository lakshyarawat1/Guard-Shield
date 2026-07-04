import { Permission, Role, ROLE_PERMISSIONS } from "../types/permissions";
import { useNativeRBAC } from "../components/auth/NativeRBACProvider";
import { useAuth } from "@clerk/react";

export function usePermission() {
  const { isLoaded: authLoaded } = useAuth();
  const { role, isLoading: rbacLoading } = useNativeRBAC();

  // If auth or RBAC is still loading, assume no permissions
  if (!authLoaded || rbacLoading) {
    return {
      hasPermission: () => false,
      role: "viewer" as Role,
      isLoading: true,
    };
  }

  const userPermissions = ROLE_PERMISSIONS[role] || [];

  const hasPermission = (permission: Permission) => {
    return userPermissions.includes(permission);
  };

  return { hasPermission, role, isLoading: false };
}
