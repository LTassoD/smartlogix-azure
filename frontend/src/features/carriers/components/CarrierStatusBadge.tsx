import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCarrierStatusDescription, getCarrierStatusLabel, type CarrierStatus } from "@/features/carriers/types/carrierTypes";
import { cn } from "@/utils/cn";

type CarrierStatusBadgeProps = {
  status: CarrierStatus;
};

export function CarrierStatusBadge({ status }: CarrierStatusBadgeProps) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        status === "ACTIVE" && "bg-green-50 text-green-700 ring-green-600/20",
        status === "UNAVAILABLE" && "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
        status === "INACTIVE" && "bg-slate-100 text-slate-700 ring-slate-500/20"
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {getCarrierStatusLabel(status)}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{getCarrierStatusDescription(status)}</TooltipContent>
    </Tooltip>
  );
}
