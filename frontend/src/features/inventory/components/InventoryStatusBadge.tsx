import { StatusBadge } from "@/components/ui/StatusBadge";
import type { InventoryStockStatus } from "@/features/inventory/types/inventoryTypes";

type InventoryStatusBadgeProps = {
  status: InventoryStockStatus;
};

const statusConfig: Record<InventoryStockStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  available: {
    label: "Disponible",
    tone: "success"
  },
  low: {
    label: "Stock bajo",
    tone: "warning"
  },
  out: {
    label: "Sin stock",
    tone: "danger"
  },
  inactive: {
    label: "Inactivo",
    tone: "neutral"
  }
};

export function InventoryStatusBadge({ status }: InventoryStatusBadgeProps) {
  const config = statusConfig[status];

  return <StatusBadge label={config.label} tone={config.tone} />;
}
