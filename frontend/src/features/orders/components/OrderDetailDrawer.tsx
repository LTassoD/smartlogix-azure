import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Mail, MapPin, PackageCheck, Phone, Truck, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { FormMessage } from "@/components/ui/FormMessage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getShipmentStatusLabel } from "@/features/carriers/types/carrierTypes";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import type { Order, OrderAvailability, OrderItem } from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrderDetailDrawerProps = {
  order: Order | null;
  loading: boolean;
  error?: string | null;
  getAvailability: (order: Order) => OrderAvailability;
  onClose: () => void;
};

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function OrderDetailDrawer({ order, loading, error, getAvailability, onClose }: OrderDetailDrawerProps) {
  const [renderOrder, setRenderOrder] = useState<Order | null>(order);
  const activeOrder = order ?? renderOrder;

  useEffect(() => {
    if (order) {
      setRenderOrder(order);
    }
  }, [order]);

  if (!activeOrder && !loading) {
    return null;
  }

  return (
    <Drawer
      open={Boolean(order) || loading}
      onClose={onClose}
      title={loading && !activeOrder ? "Cargando informacion" : activeOrder?.orderNumber ?? "Detalle de pedido"}
      subtitle={activeOrder ? activeOrder.customer.fullName : "Preparando detalle del pedido."}
      footer={
        <div className="flex flex-col-reverse flex-wrap gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {loading && !activeOrder ? (
        <DetailSkeleton />
      ) : activeOrder ? (
        <div className="space-y-5">
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedido</p>
                <h4 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeOrder.orderNumber}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activeOrder.notes?.trim() || "Sin observaciones registradas."}</p>
              </div>
              <OrderStatusBadge status={activeOrder.status} />
            </div>
          </section>

          <DetailSection title="Cliente">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<UserRound className="h-4 w-4" aria-hidden="true" />} label="Nombre" value={activeOrder.customer.fullName} />
              <DetailMetric icon={<Mail className="h-4 w-4" aria-hidden="true" />} label="Correo" value={activeOrder.customer.email} />
              <DetailMetric icon={<Phone className="h-4 w-4" aria-hidden="true" />} label="Telefono" value={activeOrder.customer.phone ?? "No informado"} />
              <DetailMetric icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label="Direccion" value={activeOrder.customer.address ?? "No informado"} />
            </div>
          </DetailSection>

          <DetailSection title="Resumen">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric
                icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
                label="Productos"
                value={`${activeOrder.itemCount.toLocaleString("es-CL")} items`}
                helper={`${activeOrder.totalQuantity.toLocaleString("es-CL")} unidades solicitadas`}
              />
              <DetailMetric icon={<WalletCards className="h-4 w-4" aria-hidden="true" />} label="Total" value={currencyFormatter.format(activeOrder.totalAmount)} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Creacion" value={formatDate(activeOrder.createdAt)} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Ultima actualizacion" value={formatDate(activeOrder.updatedAt)} />
            </div>
            <AvailabilityPanel availability={getAvailability(activeOrder)} />
          </DetailSection>

          <DetailSection title="Productos">
            <div className="space-y-3">
              {activeOrder.items.map((item) => (
                <OrderItemRow key={item.id} item={item} />
              ))}
            </div>
          </DetailSection>

          <DetailSection title="Despacho">
            <DispatchPanel order={activeOrder} />
          </DetailSection>

          <DetailSection title="Trazabilidad">
            <OrderTimeline order={activeOrder} />
          </DetailSection>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Sin registros</div>
      )}
    </Drawer>
  );
}

function DispatchPanel({ order }: { order: Order }) {
  if (!order.shipment) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Pendiente de despacho.</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DetailMetric
        icon={<Truck className="h-4 w-4" aria-hidden="true" />}
        label="Transportista"
        value={order.shipment.carrier?.name ?? "Sin asignar"}
        helper={order.shipment.carrier?.code}
      />
      <DetailMetric
        icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
        label="Estado de despacho"
        value={getShipmentStatusLabel(order.shipment.status)}
      />
      <DetailMetric
        icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
        label="Destino"
        value={order.shipment.destinationCity ?? "No informado"}
        helper={order.shipment.destinationAddress ?? undefined}
      />
      <DetailMetric
        icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
        label="Seguimiento"
        value={order.shipment.trackingCode ?? "No informado"}
        helper={order.shipment.assignedAt ? `Asignado: ${formatDate(order.shipment.assignedAt)}` : undefined}
      />
    </div>
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

function AvailabilityPanel({ availability }: { availability: OrderAvailability }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 text-sm leading-6",
        availability.status === "available" && "border-green-200 bg-green-50 text-green-800",
        availability.status === "insufficient" && "border-red-200 bg-red-50 text-red-800",
        availability.status === "unknown" && "border-slate-200 bg-slate-50 text-slate-700",
        availability.status === "processed" && "border-blue-200 bg-blue-50 text-blue-800",
        availability.status === "stopped" && "border-red-200 bg-red-50 text-red-800"
      )}
    >
      <p className="font-semibold">{availability.label}</p>
      <p className="mt-1">{availability.description}</p>
      {availability.issues.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {availability.issues.map((issue) => (
            <li key={issue.itemId}>
              {issue.productName}: solicitado {issue.requestedQuantity.toLocaleString("es-CL")}, disponible{" "}
              {issue.availableStock === null ? "sin informacion" : issue.availableStock.toLocaleString("es-CL")}.
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {item.sku}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="mt-3 truncate font-semibold text-slate-950">{item.productName}</p>
            </TooltipTrigger>
            <TooltipContent>{item.productName}</TooltipContent>
          </Tooltip>
          <p className="mt-1 text-sm text-slate-500">{item.warehouseName ?? `Bodega ${item.warehouseId}`}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-right sm:min-w-[280px]">
          <ItemMetric label="Solicitado" value={item.quantity.toLocaleString("es-CL")} />
          <ItemMetric label="Disponible" value={item.availableStock === null ? "Sin datos" : item.availableStock.toLocaleString("es-CL")} />
          <ItemMetric label="Unitario" value={currencyFormatter.format(item.unitPrice)} />
          <ItemMetric label="Subtotal" value={currencyFormatter.format(item.subtotal)} />
        </div>
      </div>
    </div>
  );
}

function ItemMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No informado";
  }

  return dateFormatter.format(date);
}
