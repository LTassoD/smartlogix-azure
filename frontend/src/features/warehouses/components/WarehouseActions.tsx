import { Eye, PackageSearch, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Warehouse } from "@/features/warehouses/types/warehouseTypes";
import { cn } from "@/utils/cn";

type WarehouseActionsProps = {
  warehouse: Warehouse;
  permissions: {
    canViewDetail: boolean;
    canViewStock: boolean;
  };
  layout?: "icon" | "full";
  onViewDetail: (warehouse: Warehouse) => void;
  onViewStock: (warehouse: Warehouse) => void;
};

export function WarehouseActions({ layout = "icon", onViewDetail, onViewStock, permissions, warehouse }: WarehouseActionsProps) {
  return (
    <div className={cn(layout === "icon" ? "inline-flex min-w-[88px] justify-end gap-1.5" : "grid grid-cols-2 gap-2")}>
      {permissions.canViewDetail ? <ActionIconButton icon={Eye} label="Ver detalle" layout={layout} onClick={() => onViewDetail(warehouse)} /> : null}
      {permissions.canViewStock ? <ActionIconButton icon={PackageSearch} label="Ver stock" layout={layout} onClick={() => onViewStock(warehouse)} /> : null}
    </div>
  );
}

function ActionIconButton({
  icon: Icon,
  label,
  layout,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  layout: "icon" | "full";
  onClick: () => void;
}) {
  const button = (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "rounded-xl border-slate-300 text-slate-700 !shadow-none hover:-translate-y-0 hover:border-slate-400 hover:bg-slate-50 hover:!shadow-none focus-visible:ring-4",
        layout === "icon" ? "h-10 min-h-10 w-10 p-0" : "min-h-11 justify-start px-3 py-2 text-left text-xs leading-tight"
      )}
      onClick={onClick}
      aria-label={label}
    >
      <Icon aria-hidden="true" absoluteStrokeWidth className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      {layout === "full" ? <span className="min-w-0 whitespace-normal break-words">{label}</span> : null}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
