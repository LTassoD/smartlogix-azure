import type { AuthRole } from "@/features/auth/types/authTypes";
import { PERMISSIONS, type Permission } from "@/features/auth/permissions/permissions";

const OPERATOR_PERMISSIONS = [
  "dashboard:view",
  "inventory:view",
  "inventory:view-detail",
  "inventory:create",
  "inventory:edit",
  "inventory:adjust-stock",
  "inventory:deactivate",
  "orders:view",
  "orders:view-detail",
  "orders:create",
  "orders:validate",
  "orders:update-status",
  "orders:cancel",
  "orders:assign-carrier",
  "shipments:view",
  "shipments:view-detail",
  "shipments:update-status",
  "shipments:cancel",
  "shipments:create-incident",
  "carriers:view",
  "carriers:view-detail",
  "carriers:update-availability",
  "warehouses:view",
  "warehouses:view-detail",
  "warehouses:view-stock",
  "warehouses:create",
  "reports:view",
  "settings:view"
] as const satisfies readonly Permission[];

const VIEWER_PERMISSIONS = [
  "dashboard:view",
  "inventory:view",
  "inventory:view-detail",
  "orders:view",
  "orders:view-detail",
  "shipments:view",
  "shipments:view-detail",
  "carriers:view",
  "carriers:view-detail",
  "warehouses:view",
  "warehouses:view-detail",
  "warehouses:view-stock",
  "reports:view",
  "settings:view"
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS: Record<AuthRole, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  OPERATOR: OPERATOR_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS
};

export function getPermissionsForRole(role: AuthRole | null | undefined): Permission[] {
  if (!role) {
    return [];
  }

  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(role: AuthRole | null | undefined, permission: Permission): boolean {
  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: AuthRole | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: AuthRole | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
