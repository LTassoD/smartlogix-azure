import type { ReactNode } from "react";
import { DataPagination, type DataPaginationProps } from "@/components/ui/data-pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CarrierActions } from "@/features/carriers/components/CarrierActions";
import { CarrierStatusBadge } from "@/features/carriers/components/CarrierStatusBadge";
import { getShipmentStatusLabel, type Carrier } from "@/features/carriers/types/carrierTypes";
import { cn } from "@/utils/cn";

type CarriersTableProps = {
  carriers: Carrier[];
  loading: boolean;
  pagination: DataPaginationProps;
  permissions: CarrierActionPermissions;
  onViewDetail: (carrier: Carrier) => void;
  onToggleAvailability: (carrier: Carrier) => void;
};

type CarrierActionPermissions = {
  canViewDetail: boolean;
  canUpdateAvailability: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function CarriersTable({ carriers, loading, onToggleAvailability, onViewDetail, pagination, permissions }: CarriersTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Transportistas registrados</h3>
          <p className="mt-1 text-sm text-slate-500">Disponibilidad y asignaciones logisticas.</p>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {loading ? "Cargando..." : `${pagination.totalItems.toLocaleString("es-CL")} transportistas`}
        </p>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {loading ? (
          <CarrierMobileSkeleton />
        ) : (
          carriers.map((carrier) => (
            <CarrierMobileCard
              key={carrier.id}
              carrier={carrier}
              onViewDetail={onViewDetail}
              onToggleAvailability={onToggleAvailability}
              permissions={permissions}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[1040px] divide-y divide-slate-200 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              <TableHeader>Codigo</TableHeader>
              <TableHeader>Transportista</TableHeader>
              <TableHeader>Servicio</TableHeader>
              <TableHeader>Despachos</TableHeader>
              <TableHeader>Ultimo despacho</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Actualizacion</TableHeader>
              <TableHeader align="right" className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50/95 pl-4">
                Acciones
              </TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <CarrierTableSkeleton />
            ) : (
              carriers.map((carrier) => (
                <CarrierTableRow
                  key={carrier.id}
                  carrier={carrier}
                  onViewDetail={onViewDetail}
                  onToggleAvailability={onToggleAvailability}
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

function CarrierTableRow({
  carrier,
  onToggleAvailability,
  onViewDetail,
  permissions
}: {
  carrier: Carrier;
  onViewDetail: (carrier: Carrier) => void;
  onToggleAvailability: (carrier: Carrier) => void;
  permissions: CarrierActionPermissions;
}) {
  const latestShipment = carrier.assignedShipments.at(-1) ?? null;

  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/90">
      <TableCell>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-white">
          {carrier.code}
        </span>
      </TableCell>
      <TableCell>
        <div className="max-w-[220px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="truncate font-semibold text-slate-950">{carrier.name}</p>
            </TooltipTrigger>
            <TooltipContent>{carrier.name}</TooltipContent>
          </Tooltip>
          <p className="mt-1 truncate text-sm text-slate-500">Proveedor logistico</p>
        </div>
      </TableCell>
      <TableCell>{formatServiceType(carrier.serviceType)}</TableCell>
      <TableCell>
        <span className="font-semibold tabular-nums text-slate-900">{carrier.assignedShipments.length.toLocaleString("es-CL")}</span>
      </TableCell>
      <TableCell>
        {latestShipment ? (
          <div className="max-w-[180px]">
            <p className="truncate font-semibold text-slate-800">{latestShipment.shipmentNumber}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{getShipmentStatusLabel(latestShipment.status)}</p>
          </div>
        ) : (
          <span className="text-slate-500">Sin registros</span>
        )}
      </TableCell>
      <TableCell>
        <CarrierStatusBadge status={carrier.status} />
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(carrier.updatedAt)}</span>
      </TableCell>
      <TableCell align="right" className="sticky right-0 z-10 border-l border-slate-100 bg-white pl-4 transition-colors group-hover:bg-slate-50/95">
        <CarrierActions carrier={carrier} onViewDetail={onViewDetail} onToggleAvailability={onToggleAvailability} permissions={permissions} />
      </TableCell>
    </tr>
  );
}

function CarrierMobileCard({
  carrier,
  onToggleAvailability,
  onViewDetail,
  permissions
}: {
  carrier: Carrier;
  onViewDetail: (carrier: Carrier) => void;
  onToggleAvailability: (carrier: Carrier) => void;
  permissions: CarrierActionPermissions;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-150 hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {carrier.code}
          </span>
          <h4 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">{carrier.name}</h4>
          <p className="mt-1 truncate text-sm leading-5 text-slate-500">{formatServiceType(carrier.serviceType)}</p>
        </div>
        <CarrierStatusBadge status={carrier.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MobileMetric label="Despachos" value={carrier.assignedShipments.length.toLocaleString("es-CL")} />
        <MobileMetric label="Actualizacion" value={formatDate(carrier.updatedAt)} />
      </div>

      <div className="mt-4">
        <CarrierActions carrier={carrier} layout="full" onViewDetail={onViewDetail} onToggleAvailability={onToggleAvailability} permissions={permissions} />
      </div>
    </article>
  );
}

function CarrierTableSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <tr key={index}>
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

function CarrierMobileSkeleton() {
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
