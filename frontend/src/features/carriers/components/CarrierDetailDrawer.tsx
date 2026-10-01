import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Hash, PackageCheck, RadioTower, Truck, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { FormMessage } from "@/components/ui/FormMessage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CarrierStatusBadge } from "@/features/carriers/components/CarrierStatusBadge";
import {
  getShipmentStatusLabel,
  type Carrier,
  type Shipment,
  type ShipmentStatusHistoryEvent
} from "@/features/carriers/types/carrierTypes";

type CarrierDetailDrawerProps = {
  carrier: Carrier | null;
  shipments: Shipment[];
  history: ShipmentStatusHistoryEvent[];
  loading: boolean;
  error?: string | null;
  permissions: {
    canUpdateAvailability: boolean;
  };
  onClose: () => void;
  onToggleAvailability: (carrier: Carrier) => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function CarrierDetailDrawer({
  carrier,
  error,
  history,
  loading,
  onClose,
  onToggleAvailability,
  permissions,
  shipments
}: CarrierDetailDrawerProps) {
  const [renderCarrier, setRenderCarrier] = useState<Carrier | null>(carrier);
  const activeCarrier = carrier ?? renderCarrier;

  useEffect(() => {
    if (carrier) {
      setRenderCarrier(carrier);
    }
  }, [carrier]);

  if (!activeCarrier && !loading) {
    return null;
  }

  return (
    <Drawer
      open={Boolean(carrier) || loading}
      onClose={onClose}
      title={loading && !activeCarrier ? "Cargando informacion" : activeCarrier?.name ?? "Detalle de transportista"}
      subtitle={activeCarrier ? activeCarrier.code : "Preparando detalle del transportista."}
      footer={
        <div className="flex flex-col-reverse flex-wrap gap-3 sm:flex-row sm:justify-end">
          {permissions.canUpdateAvailability && activeCarrier ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="secondary" onClick={() => onToggleAvailability(activeCarrier)}>
                  {activeCarrier.simulatedAvailable ? <RadioTower className="h-4 w-4" aria-hidden="true" /> : <PackageCheck className="h-4 w-4" aria-hidden="true" />}
                  {activeCarrier.simulatedAvailable ? "Marcar no disponible" : "Marcar disponible"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{activeCarrier.simulatedAvailable ? "Pausar nuevas asignaciones" : "Permitir nuevas asignaciones"}</TooltipContent>
            </Tooltip>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {loading && !activeCarrier ? (
        <DetailSkeleton />
      ) : activeCarrier ? (
        <div className="space-y-5">
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transportista</p>
                <h4 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeCarrier.name}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{formatServiceType(activeCarrier.serviceType)}</p>
              </div>
              <CarrierStatusBadge status={activeCarrier.status} />
            </div>
          </section>

          <DetailSection title="Informacion general">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<Hash className="h-4 w-4" aria-hidden="true" />} label="Codigo" value={activeCarrier.code} />
              <DetailMetric icon={<Truck className="h-4 w-4" aria-hidden="true" />} label="Servicio" value={formatServiceType(activeCarrier.serviceType)} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Creacion" value={formatDate(activeCarrier.createdAt)} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Ultima actualizacion" value={formatDate(activeCarrier.updatedAt)} />
            </div>
          </DetailSection>

          <DetailSection title="Operacion">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric
                icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
                label="Disponibilidad"
                value={activeCarrier.simulatedAvailable ? "Disponible" : "No disponible"}
              />
              <DetailMetric
                icon={<Waypoints className="h-4 w-4" aria-hidden="true" />}
                label="Despachos asociados"
                value={shipments.length > 0 ? shipments.length.toLocaleString("es-CL") : "Sin registros asociados"}
              />
            </div>
          </DetailSection>

          <DetailSection title="Despachos asociados">
            {shipments.length > 0 ? (
              <div className="space-y-3">
                {shipments.map((shipment) => (
                  <ShipmentRow key={shipment.id} shipment={shipment} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Sin registros asociados</div>
            )}
          </DetailSection>

          <DetailSection title="Historial logistico">
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{getShipmentStatusLabel(event.newStatus)}</p>
                        <p className="mt-1 text-sm text-slate-500">{event.comment?.trim() || "Movimiento registrado."}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{formatDate(event.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Sin movimientos registrados.</div>
            )}
          </DetailSection>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Sin registros</div>
      )}
    </Drawer>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
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

function ShipmentRow({ shipment }: { shipment: Shipment }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {shipment.shipmentNumber}
          </span>
          <p className="mt-3 truncate font-semibold text-slate-950">{shipment.orderNumber}</p>
          <p className="mt-1 text-sm text-slate-500">{shipment.destinationCity ?? "Destino no informado"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right sm:min-w-[280px]">
          <ItemMetric label="Estado" value={getShipmentStatusLabel(shipment.status)} />
          <ItemMetric label="Seguimiento" value={shipment.trackingCode ?? "No informado"} />
          <ItemMetric label="Asignacion" value={formatDate(shipment.assignedAt)} />
          <ItemMetric label="Actualizacion" value={formatDate(shipment.updatedAt)} />
        </div>
      </div>
    </div>
  );
}

function ItemMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-950" title={value}>
        {value}
      </p>
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

function formatServiceType(value: string | null): string {
  if (!value) {
    return "No informado";
  }

  return value
    .toLocaleLowerCase("es-CL")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1))
    .join(" ");
}
