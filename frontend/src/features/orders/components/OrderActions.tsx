import { CheckCircle2, Eye, GitBranch, Truck, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Order, OrderAvailability, OrderStatus } from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrderActionsProps = {
  order: Order;
  availability: OrderAvailability;
  nextStatuses: OrderStatus[];
  permissions: {
    canViewDetail: boolean;
    canValidateOrder: boolean;
    canChangeStatus: boolean;
    canCancelOrder: boolean;
    canAssignCarrier: boolean;
  };
  layout?: "icon" | "full";
  onViewDetail: (order: Order) => void;
  onConfirm: (order: Order) => void;
  onChangeStatus: (order: Order) => void;
  onCancel: (order: Order) => void;
};

export function OrderActions({
  order,
  availability,
  nextStatuses,
  permissions,
  layout = "icon",
  onViewDetail,
  onConfirm,
  onChangeStatus,
  onCancel
}: OrderActionsProps) {
  const confirmDisabled = order.status !== "CREATED" || availability.status !== "available";
  const confirmTooltip = getConfirmTooltip(order, availability);
  const canCancel = order.status === "CREATED" || order.status === "CONFIRMED";
  const canChangeStatus = nextStatuses.length > 0;
  const dispatchAction = nextStatuses.length === 1 && nextStatuses[0] === "SHIPPED";
  const canRunDispatchAction = !dispatchAction || permissions.canAssignCarrier;

  return (
    <div className={cn(layout === "icon" ? "inline-flex min-w-[132px] justify-end gap-1.5" : "grid grid-cols-2 gap-2")}>
      {permissions.canViewDetail ? <ActionIconButton icon={Eye} label="Ver detalle" layout={layout} onClick={() => onViewDetail(order)} /> : null}
      {permissions.canValidateOrder && order.status === "CREATED" ? (
        <ActionIconButton
          icon={CheckCircle2}
          label={confirmTooltip}
          ariaLabel="Confirmar pedido"
          layout={layout}
          tone="success"
          onClick={() => onConfirm(order)}
          disabled={confirmDisabled}
        />
      ) : null}
      {permissions.canChangeStatus && canChangeStatus && canRunDispatchAction ? (
        <ActionIconButton
          icon={dispatchAction ? Truck : GitBranch}
          label={dispatchAction ? "Marcar en despacho" : "Cambiar estado"}
          layout={layout}
          onClick={() => onChangeStatus(order)}
        />
      ) : null}
      {permissions.canCancelOrder && canCancel ? (
        <ActionIconButton icon={XCircle} label="Cancelar pedido" layout={layout} tone="danger" onClick={() => onCancel(order)} />
      ) : null}
    </div>
  );
}

function ActionIconButton({
  ariaLabel,
  disabled,
  icon: Icon,
  label,
  layout,
  onClick,
  tone = "neutral"
}: {
  ariaLabel?: string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  layout: "icon" | "full";
  onClick: () => void;
  tone?: "neutral" | "danger" | "success";
}) {
  const button = (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "rounded-xl border-slate-300 text-slate-700 !shadow-none hover:-translate-y-0 hover:border-slate-400 hover:bg-slate-50 hover:!shadow-none focus-visible:ring-4",
        layout === "icon" ? "h-10 min-h-10 w-10 p-0" : "min-h-11 justify-start px-3 py-2 text-left text-xs leading-tight",
        tone === "danger" && "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-600/15",
        tone === "success" && "border-green-200 text-green-700 hover:border-green-300 hover:bg-green-50 hover:text-green-800 focus-visible:ring-green-600/15",
        disabled && "hover:bg-white"
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
    >
      <Icon aria-hidden="true" absoluteStrokeWidth className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      {layout === "full" ? <span className="min-w-0 whitespace-normal break-words">{ariaLabel ?? label}</span> : null}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function getConfirmTooltip(order: Order, availability: OrderAvailability): string {
  if (order.status !== "CREATED") {
    return "Pedido ya procesado";
  }

  if (availability.status === "insufficient") {
    return "No hay stock suficiente";
  }

  if (availability.status === "unknown") {
    return "Disponibilidad no confirmada";
  }

  return "Confirmar pedido";
}
