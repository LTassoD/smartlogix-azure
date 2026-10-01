import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Hash, MapPin, PackageCheck, Route, Truck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { FormMessage } from "@/components/ui/FormMessage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShipmentStatusBadge } from "@/features/shipments/components/ShipmentStatusBadge";
import {
  canCancelShipment,
  getShipmentNextStatuses,
  getShipmentStatusLabel,
  type Shipment,
  type ShipmentHistoryEvent
} from "@/features/shipments/types/shipmentTypes";
import { getShipmentCustomerDisplayName } from "@/features/shipments/utils/shipmentCustomer";

type ShipmentDetailDrawerProps = {
  shipment: Shipment | null;
  history: ShipmentHistoryEvent[];
  loading: boolean;
  error?: string | null;
  permissions: {
    canUpdateStatus: boolean;
    canCancelShipment: boolean;
  };
  onClose: () => void;
  onChangeStatus: (shipment: Shipment) => void;
  onCancel: (shipment: Shipment) => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function ShipmentDetailDrawer({
  error,
  history,
  loading,
  onCancel,
  onChangeStatus,
  onClose,
  permissions,
  shipment
}: ShipmentDetailDrawerProps) {
  const [renderShipment, setRenderShipment] = useState<Shipment | null>(shipment);
  const activeShipment = shipment ?? renderShipment;

  useEffect(() => {
    if (shipment) {
      setRenderShipment(shipment);
    }
  }, [shipment]);

  if (!activeShipment && !loading) {
    return null;
  }

  return (
    <Drawer
      open={Boolean(shipment) || loading}
      onClose={onClose}
      title={loading && !activeShipment ? "Cargando informacion" : activeShipment?.shipmentNumber ?? "Detalle de envio"}
      subtitle={activeShipment ? activeShipment.orderNumber : "Preparando detalle del envio."}
      footer={
        <div className="flex flex-col-reverse flex-wrap gap-3 sm:flex-row sm:justify-end">
          {permissions.canUpdateStatus && activeShipment && getShipmentNextStatuses(activeShipment.status).length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="secondary" onClick={() => onChangeStatus(activeShipment)}>
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                  Cambiar estado
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar estado del envio</TooltipContent>
            </Tooltip>
          ) : null}
          {permissions.canCancelShipment && activeShipment && canCancelShipment(activeShipment.status) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="danger" onClick={() => onCancel(activeShipment)}>
                  Cancelar envio
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancelar envio</TooltipContent>
            </Tooltip>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {loading && !activeShipment ? (
        <DetailSkeleton />
      ) : activeShipment ? (
        <div className="space-y-5">
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Envio</p>
                <h4 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeShipment.shipmentNumber}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activeShipment.orderNumber}</p>
              </div>
              <ShipmentStatusBadge status={activeShipment.status} />
            </div>
          </section>

          <DetailSection title="Resumen">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<Hash className="h-4 w-4" aria-hidden="true" />} label="Codigo" value={activeShipment.shipmentNumber} />
              <DetailMetric icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />} label="Pedido asociado" value={activeShipment.orderNumber} />
              <DetailMetric icon={<UserRound className="h-4 w-4" aria-hidden="true" />} label="Cliente" value={getShipmentCustomerDisplayName(activeShipment)} />
              <DetailMetric
                icon={<Truck className="h-4 w-4" aria-hidden="true" />}
                label="Transportista"
                value={activeShipment.carrier?.name ?? "Sin asignar"}
                helper={activeShipment.carrier?.code}
              />
              <DetailMetric
                icon={<Route className="h-4 w-4" aria-hidden="true" />}
                label="Tracking"
                value={activeShipment.trackingCode ?? "No informado"}
              />
            </div>
          </DetailSection>

          <DetailSection title="Destino">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label="Ciudad" value={activeShipment.destinationCity ?? "No informado"} />
              <DetailMetric
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                label="Direccion"
                value={activeShipment.destinationAddress ?? "No informado"}
              />
            </div>
            {activeShipment.fallbackReason ? <FormMessage tone="info">{formatFallbackReason(activeShipment.fallbackReason)}</FormMessage> : null}
          </DetailSection>

          <DetailSection title="Fechas">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Creacion" value={formatDate(activeShipment.createdAt)} />
              <DetailMetric
                icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                label="Ultima actualizacion"
                value={formatDate(activeShipment.updatedAt)}
              />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Asignacion" value={formatDate(activeShipment.assignedAt)} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Despacho" value={formatDate(activeShipment.shippedAt)} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Entrega" value={formatDate(activeShipment.deliveredAt)} />
            </div>
          </DetailSection>

          <DetailSection title="Historial">
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{getShipmentStatusLabel(event.newStatus)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatHistoryComment(event.comment, event.newStatus)}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{formatDate(event.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Sin registros</div>
            )}
          </DetailSection>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Sin registros</div>
      )}
    </Drawer>
  );
}

function DetailSection({ children, title }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function DetailMetric({
  helper,
  icon,
  label,
  value
}: {
  helper?: string;
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className="mt-2 truncate text-base font-semibold text-slate-950" title={value}>
        {value || "No informado"}
      </p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No informado";
  }

  return dateFormatter.format(date);
}

function formatHistoryComment(comment: string | null, status: string): string {
  const trimmedComment = comment?.trim();

  if (!trimmedComment) {
    return "Movimiento registrado.";
  }

  const normalizedComment = trimmedComment.toLocaleLowerCase("es-CL");

  if (normalizedComment === "shipment created from ordercreatedevent") {
    return "Envio creado desde el pedido.";
  }

  if (normalizedComment === "manual shipment created") {
    return "Envio registrado manualmente.";
  }

  if (normalizedComment.startsWith("carrier assigned")) {
    return "Transportista asignado.";
  }

  if (normalizedComment === "shipment cancelled") {
    return "Envio cancelado.";
  }

  if (normalizedComment.includes("despacho") || normalizedComment.includes("entrega") || normalizedComment.includes("cancel")) {
    return trimmedComment;
  }

  return getShipmentStatusLabel(status);
}

function formatFallbackReason(reason: string): string {
  const normalizedReason = reason.trim().toLocaleLowerCase("es-CL");

  if (normalizedReason.includes("no available carrier")) {
    return "No se encontro un transportista disponible.";
  }

  if (normalizedReason.includes("fallback carrier")) {
    return "Se asigno un transportista alternativo.";
  }

  return "Se registro una observacion operativa.";
}
