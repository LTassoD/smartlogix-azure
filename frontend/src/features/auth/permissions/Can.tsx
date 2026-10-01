import type { ReactNode } from "react";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import type { Permission } from "@/features/auth/permissions/permissions";

type CanProps = {
  permission: Permission | readonly Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  match?: "all" | "any";
};

export function Can({ children, fallback = null, match = "all", permission }: CanProps) {
  const { can, canAll, canAny } = usePermissions();
  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = permissions.length === 1 ? can(permissions[0]) : match === "any" ? canAny(permissions) : canAll(permissions);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
