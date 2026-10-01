import type { ReactNode } from "react";
import { DataPagination, type DataPaginationProps } from "@/components/ui/data-pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrderActions } from "@/features/orders/components/OrderActions";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import type { Order, OrderAvailability, OrderStatus } from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrdersTableProps = {
  orders: Order[];
  loading: boolean;
  pagination: DataPaginationProps;
  permissions: OrderActionPermissions;
  getAvailability: (order: Order) => OrderAvailability;
  getNextStatuses: (order: Order) => OrderStatus[];
  onViewDetail: (order: Order) => void;
  onConfirm: (order: Order) => void;
  onChangeStatus: (order: Order) => void;
  onCancel: (order: Order) => void;
};

type OrderActionPermissions = {
  canViewDetail: boolean;
  canValidateOrder: boolean;
  canChangeStatus: boolean;
  canCancelOrder: boolean;
  canAssignCarrier: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

export function OrdersTable({
  orders,
  loading,
  pagination,
  permissions,
  getAvailability,
  getNextStatuses,
  onViewDetail,
  onConfirm,
  onChangeStatus,
  onCancel
}: OrdersTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Pedidos registrados</h3>
          <p className="mt-1 text-sm text-slate-500">Seguimiento operativo por pedido.</p>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {loading ? "Cargando..." : `${pagination.totalItems.toLocaleString("es-CL")} pedidos`}
        </p>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {loading ? (
          <OrdersMobileSkeleton />
        ) : (
          orders.map((order) => (
            <OrderMobileCard
              key={order.id}
              order={order}
              availability={getAvailability(order)}
              nextStatuses={getNextStatuses(order)}
              onViewDetail={onViewDetail}
              onConfirm={onConfirm}
              onChangeStatus={onChangeStatus}
              onCancel={onCancel}
              permissions={permissions}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[1360px] divide-y divide-slate-200 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              <TableHeader>N Pedido</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Fecha</TableHeader>
              <TableHeader align="right">Items</TableHeader>
              <TableHeader align="right">Total</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Validacion</TableHeader>
              <TableHeader>Bodega</TableHeader>
              <TableHeader>Transportista</TableHeader>
              <TableHeader>Actualizacion</TableHeader>
              <TableHeader align="right" className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50/95 pl-4">
                Acciones
              </TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <OrdersTableSkeleton />
            ) : (
              orders.map((order) => (
                <OrdersTableRow
                  key={order.id}
                  order={order}
                  availability={getAvailability(order)}
                  nextStatuses={getNextStatuses(order)}
                  onViewDetail={onViewDetail}
                  onConfirm={onConfirm}
                  onChangeStatus={onChangeStatus}
                  onCancel={onCancel}
                  permissions={permissions}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading ? <DataPagination {...pagination} /> : null}
    </section>
  );
}

function OrdersTableRow({
  order,
  availability,
  nextStatuses,
  onViewDetail,
  onConfirm,
  onChangeStatus,
  onCancel,
  permissions
}: {
  order: Order;
  availability: OrderAvailability;
  nextStatuses: OrderStatus[];
  onViewDetail: (order: Order) => void;
  onConfirm: (order: Order) => void;
  onChangeStatus: (order: Order) => void;
  onCancel: (order: Order) => void;
  permissions: OrderActionPermissions;
}) {
  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/90">
      <TableCell>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-white">
          {order.orderNumber}
        </span>
      </TableCell>
      <TableCell>
        <div className="max-w-[220px]">
          <p className="truncate font-semibold text-slate-950" title={order.customer.fullName}>
            {order.customer.fullName}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500" title={order.customer.email}>
            {order.customer.email}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(order.createdAt)}</span>
      </TableCell>
      <TableCell align="right">
        <ItemsCell order={order} />
      </TableCell>
      <TableCell align="right">
        <span className="font-semibold tabular-nums text-slate-900">{currencyFormatter.format(order.totalAmount)}</span>
      </TableCell>
      <TableCell>
        <OrderStatusBadge status={order.status} />
      </TableCell>
      <TableCell>
        <AvailabilityBadge availability={availability} />
      </TableCell>
      <TableCell>
        <WarehouseCell order={order} />
      </TableCell>
      <TableCell>
        <CarrierCell order={order} />
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(order.updatedAt)}</span>
      </TableCell>
      <TableCell align="right" className="sticky right-0 z-10 border-l border-slate-100 bg-white pl-4 transition-colors group-hover:bg-slate-50/95">
        <OrderActions
          order={order}
          availability={availability}
          nextStatuses={nextStatuses}
          onViewDetail={onViewDetail}
          onConfirm={onConfirm}
          onChangeStatus={onChangeStatus}
          onCancel={onCancel}
          permissions={permissions}
        />
      </TableCell>
    </tr>
  );
}

function OrderMobileCard({
  order,
  availability,
  nextStatuses,
  onViewDetail,
  onConfirm,
  onChangeStatus,
  onCancel,
  permissions
}: {
  order: Order;
  availability: OrderAvailability;
  nextStatuses: OrderStatus[];
  onViewDetail: (order: Order) => void;
  onConfirm: (order: Order) => void;
  onChangeStatus: (order: Order) => void;
  onCancel: (order: Order) => void;
  permissions: OrderActionPermissions;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-150 hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {order.orderNumber}
          </span>
          <h4 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">{order.customer.fullName}</h4>
          <p className="mt-1 truncate text-sm leading-5 text-slate-500">{order.customer.email}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MobileMetric label="Items" value={order.itemCount.toLocaleString("es-CL")} helper={`${order.totalQuantity.toLocaleString("es-CL")} unidades`} />
        <MobileMetric label="Total" value={currencyFormatter.format(order.totalAmount)} />
        <MobileMetric label="Bodega" value={getWarehouseName(order)} helper={getWarehouseHelper(order)} />
        <MobileMetric label="Transportista" value={getCarrierName(order)} helper={getCarrierHelper(order)} />
        <MobileMetric label="Actualizacion" value={formatDate(order.updatedAt)} />
      </div>

      <div className="mt-4">
        <AvailabilityBadge availability={availability} />
      </div>

      <div className="mt-4">
        <OrderActions
          order={order}
          availability={availability}
          nextStatuses={nextStatuses}
          layout="full"
          onViewDetail={onViewDetail}
          onConfirm={onConfirm}
          onChangeStatus={onChangeStatus}
          onCancel={onCancel}
          permissions={permissions}
        />
      </div>
    </article>
  );
}

function OrdersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 11 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-5">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function OrdersMobileSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </>
  );
}

function TableHeader({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

function TableCell({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={cn("px-4 py-4 align-middle text-sm text-slate-700", align === "right" && "text-right", className)}>{children}</td>;
}

function ItemsCell({ order }: { order: Order }) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <span className="text-base font-semibold tabular-nums text-slate-950">{order.itemCount.toLocaleString("es-CL")}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
        {order.totalQuantity.toLocaleString("es-CL")} unidades
      </span>
    </div>
  );
}

function WarehouseCell({ order }: { order: Order }) {
  return (
    <div className="max-w-[150px]">
      <p className="truncate font-semibold text-slate-800" title={getWarehouseName(order)}>
        {getWarehouseName(order)}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">{getWarehouseHelper(order)}</p>
    </div>
  );
}

function CarrierCell({ order }: { order: Order }) {
  const carrierName = getCarrierName(order);
  const helper = getCarrierHelper(order);
  const cell = (
    <div className="max-w-[170px]">
      <p className="truncate font-semibold text-slate-800">{carrierName}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{helper}</p>
    </div>
  );

  if (order.shipment?.carrier) {
    return cell;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cell}</TooltipTrigger>
      <TooltipContent>Transportista no asignado</TooltipContent>
    </Tooltip>
  );
}

function AvailabilityBadge({ availability }: { availability: OrderAvailability }) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        availability.status === "available" && "bg-green-50 text-green-700 ring-green-600/20",
        availability.status === "insufficient" && "bg-red-50 text-red-700 ring-red-600/20",
        availability.status === "unknown" && "bg-slate-100 text-slate-700 ring-slate-500/20",
        availability.status === "processed" && "bg-blue-50 text-blue-700 ring-blue-600/20",
        availability.status === "stopped" && "bg-red-50 text-red-700 ring-red-600/20"
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {availability.label}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{availability.description}</TooltipContent>
    </Tooltip>
  );
}

function MobileMetric({ helper, label, value }: { helper?: string; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950" title={value}>
        {value}
      </p>
      {helper ? <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function getWarehouseName(order: Order): string {
  if (order.warehouseNames.length === 0) {
    return "Sin bodega";
  }

  return order.warehouseNames[0];
}

function getWarehouseHelper(order: Order): string {
  if (order.warehouseNames.length === 0) {
    return "Sin informacion";
  }

  if (order.warehouseNames.length === 1) {
    return order.items[0]?.warehouseCode ?? "Bodega asignada";
  }

  return `${order.warehouseNames.length} bodegas`;
}

function getCarrierName(order: Order): string {
  return order.shipment?.carrier?.name ?? "Sin asignar";
}

function getCarrierHelper(order: Order): string {
  if (!order.shipment) {
    return "Pendiente de despacho";
  }

  if (order.shipment.trackingCode) {
    return order.shipment.trackingCode;
  }

  return order.shipment.shipmentNumber;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No informado";
  }

  return dateFormatter.format(date);
}
