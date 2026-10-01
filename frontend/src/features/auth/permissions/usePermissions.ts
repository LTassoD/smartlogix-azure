import { useCallback, useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PAGE_PERMISSIONS, type PageKey, type Permission } from "@/features/auth/permissions/permissions";
import {
  getPermissionsForRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission
} from "@/features/auth/permissions/roleAccess";

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  const can = useCallback((permission: Permission) => hasPermission(role, permission), [role]);

  const canAny = useCallback((requiredPermissions: readonly Permission[]) => hasAnyPermission(role, requiredPermissions), [role]);

  const canAll = useCallback((requiredPermissions: readonly Permission[]) => hasAllPermissions(role, requiredPermissions), [role]);

  const canViewPage = useCallback((page: PageKey) => can(PAGE_PERMISSIONS[page]), [can]);

  return {
    role,
    permissions,
    can,
    canAny,
    canAll,
    canViewPage,
    canCreateProduct: () => can("inventory:create"),
    canEditProduct: () => can("inventory:edit"),
    canDeactivateProduct: () => can("inventory:deactivate"),
    canAdjustStock: () => can("inventory:adjust-stock"),
    canViewOrders: () => can("orders:view"),
    canCreateOrder: () => can("orders:create"),
    canValidateOrder: () => can("orders:validate"),
    canChangeOrderStatus: () => can("orders:update-status"),
    canCancelOrder: () => can("orders:cancel"),
    canAssignCarrier: () => can("orders:assign-carrier"),
    canViewShipments: () => can("shipments:view"),
    canUpdateShipmentStatus: () => can("shipments:update-status"),
    canCancelShipment: () => can("shipments:cancel"),
    canCreateShipmentIncident: () => can("shipments:create-incident"),
    canViewCarriers: () => can("carriers:view"),
    canUpdateCarrierAvailability: () => can("carriers:update-availability"),
    canViewWarehouses: () => can("warehouses:view"),
    canCreateWarehouse: () => can("warehouses:create"),
    canEditWarehouse: () => can("warehouses:edit"),
    canToggleWarehouseActive: () => can("warehouses:toggle-active"),
    canViewReports: () => can("reports:view"),
    canExportReports: () => can("reports:export"),
    canViewSettings: () => can("settings:view")
  };
}
