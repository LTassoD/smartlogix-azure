import { Eye, GitBranch, Route, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  canCancelShipment,
  getShipmentNextStatuses,
  type Shipment
} from "@/features/shipments/types/shipmentTypes";
import { cn } from "@/utils/cn";

type ShipmentActionsProps = {
  shipment: Shipment;
  permissions: {
    canViewDetail: boolean;
    canUpdateStatus: boolean;
    canCancelShipment: boolean;
  };
  layout?: "icon" | "full";
  onViewDetail: (shipment: Shipment) => void;
  onChangeStatus: (shipment: Shipment) => void;
  onCancel: (shipment: Shipment) => void;
};

export function ShipmentActions({
  layout = "icon",
  onCancel,
  onChangeStatus,
  onViewDetail,
  permissions,
  shipment
}: ShipmentActionsProps) {
  const nextStatuses = getShipmentNextStatuses(shipment.status);
  const canChangeStatus = nextStatuses.length > 0;
  const canCancel = canCancelShipment(shipment.status);

  return (
    <div className={cn(layout === "icon" ? "inline-flex min-w-[136px] justify-end gap-1.5" : "grid grid-cols-2 gap-2")}>
      {permissions.canViewDetail ? <ActionIconButton icon={Eye} label="Ver detalle" layout={layout} onClick={() => onViewDetail(shipment)} /> : null}
      {permissions.canViewDetail && shipment.trackingCode ? (
        <ActionIconButton icon={Route} label="Ver tracking" layout={layout} onClick={() => onViewDetail(shipment)} />
      ) : null}
      {permissions.canUpdateStatus && canChangeStatus ? (
        <ActionIconButton icon={GitBranch} label="Cambiar estado" layout={layout} onClick={() => onChangeStatus(shipment)} />
      ) : null}
      {permissions.canCancelShipment && canCancel ? (
        <ActionIconButton icon={XCircle} label="Cancelar envio" layout={layout} tone="danger" onClick={() => onCancel(shipment)} />
      ) : null}
    </div>
  );
}

function ActionIconButton({
  icon: Icon,
  label,
  layout,
  onClick,
  tone = "neutral"
}: {
  icon: LucideIcon;
  label: string;
  layout: "icon" | "full";
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  const button = (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "rounded-xl border-slate-300 text-slate-700 !shadow-none hover:-translate-y-0 hover:border-slate-400 hover:bg-slate-50 hover:!shadow-none focus-visible:ring-4",
        layout === "icon" ? "h-10 min-h-10 w-10 p-0" : "min-h-11 justify-start px-3 py-2 text-left text-xs leading-tight",
        tone === "danger" && "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-600/15"
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
