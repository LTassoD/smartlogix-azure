import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getWarehouseStatusDescription,
  getWarehouseStatusLabel,
  type WarehouseStatus
} from "@/features/warehouses/types/warehouseTypes";
import { cn } from "@/utils/cn";

type WarehouseStatusBadgeProps = {
  status: WarehouseStatus;
};

export function WarehouseStatusBadge({ status }: WarehouseStatusBadgeProps) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        status === "ACTIVE" && "bg-green-50 text-green-700 ring-green-600/20",
        status === "INACTIVE" && "bg-slate-100 text-slate-700 ring-slate-500/20"
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {getWarehouseStatusLabel(status)}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{getWarehouseStatusDescription(status)}</TooltipContent>
    </Tooltip>
  );
}
