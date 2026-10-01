export const PERMISSIONS = [
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
  "carriers:create",
  "carriers:edit",
  "warehouses:view",
  "warehouses:view-detail",
  "warehouses:view-stock",
  "warehouses:create",
  "warehouses:edit",
  "warehouses:toggle-active",
  "reports:view",
  "reports:export",
  "settings:view"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PageKey =
  | "dashboard"
  | "inventory"
  | "orders"
  | "shipments"
  | "carriers"
  | "warehouses"
  | "reports"
  | "settings";

export const PAGE_PERMISSIONS: Record<PageKey, Permission> = {
  dashboard: "dashboard:view",
  inventory: "inventory:view",
  orders: "orders:view",
  shipments: "shipments:view",
  carriers: "carriers:view",
  warehouses: "warehouses:view",
  reports: "reports:view",
  settings: "settings:view"
};

export const ACCESS_RESTRICTED_MESSAGE = "No tienes permisos para acceder a esta sección.";
export const ACTION_DENIED_MESSAGE = "No tienes permiso para realizar esta acción.";
export const ACTION_FORBIDDEN_TOAST_MESSAGE = "No tienes permisos para completar esta acción.";
