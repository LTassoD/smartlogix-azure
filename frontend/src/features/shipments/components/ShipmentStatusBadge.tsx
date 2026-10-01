import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SHIPMENT_STATUS_DESCRIPTIONS,
  getShipmentStatusLabel,
  type ShipmentStatus
} from "@/features/shipments/types/shipmentTypes";
import { cn } from "@/utils/cn";

type ShipmentStatusBadgeProps = {
  status: ShipmentStatus;
};

export function ShipmentStatusBadge({ status }: ShipmentStatusBadgeProps) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors duration-200",
        (status === "CREATED" || status === "PENDING_ASSIGNMENT") && "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
        status === "ASSIGNED" && "bg-blue-50 text-blue-700 ring-blue-600/20",
        status === "IN_TRANSIT" && "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
        status === "DELIVERED" && "bg-green-50 text-green-700 ring-green-600/20",
        (status === "CANCELLED" || status === "FAILED") && "bg-red-50 text-red-700 ring-red-600/20"
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {getShipmentStatusLabel(status)}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{SHIPMENT_STATUS_DESCRIPTIONS[status]}</TooltipContent>
    </Tooltip>
  );
}
