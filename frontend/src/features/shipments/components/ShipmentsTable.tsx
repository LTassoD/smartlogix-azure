import type { ReactNode } from "react";
import { DataPagination, type DataPaginationProps } from "@/components/ui/data-pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShipmentActions } from "@/features/shipments/components/ShipmentActions";
import { ShipmentStatusBadge } from "@/features/shipments/components/ShipmentStatusBadge";
import type { Shipment } from "@/features/shipments/types/shipmentTypes";
import { getShipmentCustomerDisplayName } from "@/features/shipments/utils/shipmentCustomer";
import { cn } from "@/utils/cn";

type ShipmentsTableProps = {
  shipments: Shipment[];
  loading: boolean;
  pagination: DataPaginationProps;
  permissions: ShipmentActionPermissions;
  onViewDetail: (shipment: Shipment) => void;
  onChangeStatus: (shipment: Shipment) => void;
  onCancel: (shipment: Shipment) => void;
};

type ShipmentActionPermissions = {
  canViewDetail: boolean;
  canUpdateStatus: boolean;
  canCancelShipment: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function ShipmentsTable({ loading, onCancel, onChangeStatus, onViewDetail, pagination, permissions, shipments }: ShipmentsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Envios registrados</h3>
          <p className="mt-1 text-sm text-slate-500">Seguimiento logistico por despacho.</p>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {loading ? "Cargando..." : `${pagination.totalItems.toLocaleString("es-CL")} envios`}
        </p>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {loading ? (
          <ShipmentMobileSkeleton />
        ) : (
          shipments.map((shipment) => (
            <ShipmentMobileCard
              key={shipment.id}
              shipment={shipment}
              onCancel={onCancel}
              onChangeStatus={onChangeStatus}
              onViewDetail={onViewDetail}
              permissions={permissions}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[1180px] divide-y divide-slate-200 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              <TableHeader>Codigo envio</TableHeader>
              <TableHeader>Pedido asociado</TableHeader>
              <TableHeader>Transportista</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Tracking</TableHeader>
              <TableHeader>Fecha creacion</TableHeader>
              <TableHeader>Ultima actualizacion</TableHeader>
              <TableHeader align="right" className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50/95 pl-4">
                Acciones
              </TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <ShipmentsTableSkeleton />
            ) : (
              shipments.map((shipment) => (
                <ShipmentTableRow
                  key={shipment.id}
                  shipment={shipment}
                  onCancel={onCancel}
                  onChangeStatus={onChangeStatus}
                  onViewDetail={onViewDetail}
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

function ShipmentTableRow({
  onCancel,
  onChangeStatus,
  onViewDetail,
  permissions,
  shipment
}: {
  shipment: Shipment;
  onViewDetail: (shipment: Shipment) => void;
  onChangeStatus: (shipment: Shipment) => void;
  onCancel: (shipment: Shipment) => void;
  permissions: ShipmentActionPermissions;
}) {
  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/90">
      <TableCell>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-white">
          {shipment.shipmentNumber}
        </span>
      </TableCell>
      <TableCell>
        <div className="max-w-[180px]">
          <p className="truncate font-semibold text-slate-950" title={shipment.orderNumber}>
            {shipment.orderNumber}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500" title={getShipmentCustomerDisplayName(shipment)}>
            {getShipmentCustomerDisplayName(shipment)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <CarrierCell shipment={shipment} />
      </TableCell>
      <TableCell>
        <ShipmentStatusBadge status={shipment.status} />
      </TableCell>
      <TableCell>
        <TrackingCell shipment={shipment} />
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(shipment.createdAt)}</span>
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(shipment.updatedAt)}</span>
      </TableCell>
      <TableCell align="right" className="sticky right-0 z-10 border-l border-slate-100 bg-white pl-4 transition-colors group-hover:bg-slate-50/95">
        <ShipmentActions shipment={shipment} onCancel={onCancel} onChangeStatus={onChangeStatus} onViewDetail={onViewDetail} permissions={permissions} />
      </TableCell>
    </tr>
  );
}

function ShipmentMobileCard({
  onCancel,
  onChangeStatus,
  onViewDetail,
  permissions,
  shipment
}: {
  shipment: Shipment;
  onViewDetail: (shipment: Shipment) => void;
  onChangeStatus: (shipment: Shipment) => void;
  onCancel: (shipment: Shipment) => void;
  permissions: ShipmentActionPermissions;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-150 hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {shipment.shipmentNumber}
          </span>
          <h4 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">{shipment.orderNumber}</h4>
          <p className="mt-1 truncate text-sm leading-5 text-slate-500">{getShipmentCustomerDisplayName(shipment)}</p>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MobileMetric label="Tracking" value={shipment.trackingCode ?? "No informado"} />
        <MobileMetric label="Creacion" value={formatDate(shipment.createdAt)} />
        <MobileMetric label="Destino" value={shipment.destinationCity ?? "No informado"} />
        <MobileMetric label="Cliente" value={getShipmentCustomerDisplayName(shipment)} />
        <MobileMetric label="Transportista" value={shipment.carrier?.name ?? "Sin asignar"} />
        <MobileMetric label="Actualizacion" value={formatDate(shipment.updatedAt)} />
      </div>

      <div className="mt-4">
        <ShipmentActions shipment={shipment} layout="full" onCancel={onCancel} onChangeStatus={onChangeStatus} onViewDetail={onViewDetail} permissions={permissions} />
      </div>
    </article>
  );
}

function CarrierCell({ shipment }: { shipment: Shipment }) {
  if (!shipment.carrier) {
    const cell = (
      <div className="max-w-[170px]">
        <p className="truncate font-semibold text-slate-800">Sin asignar</p>
        <p className="mt-1 truncate text-xs text-slate-500">Pendiente de asignacion</p>
      </div>
    );

    return (
      <Tooltip>
        <TooltipTrigger asChild>{cell}</TooltipTrigger>
        <TooltipContent>Transportista no asignado</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="max-w-[170px]">
      <p className="truncate font-semibold text-slate-800" title={shipment.carrier.name}>
        {shipment.carrier.name}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">{shipment.carrier.code}</p>
    </div>
  );
}

function TrackingCell({ shipment }: { shipment: Shipment }) {
  if (!shipment.trackingCode) {
    return <span className="text-slate-500">No informado</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-[180px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          {shipment.trackingCode}
        </span>
      </TooltipTrigger>
      <TooltipContent>{shipment.trackingCode}</TooltipContent>
    </Tooltip>
  );
}

function ShipmentsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-5">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ShipmentMobileSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
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

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950" title={value}>
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
