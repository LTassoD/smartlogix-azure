import type { ReactNode } from "react";
import { DataPagination, type DataPaginationProps } from "@/components/ui/data-pagination";
import { WarehouseActions } from "@/features/warehouses/components/WarehouseActions";
import { WarehouseStatusBadge } from "@/features/warehouses/components/WarehouseStatusBadge";
import type { Warehouse } from "@/features/warehouses/types/warehouseTypes";
import { cn } from "@/utils/cn";

type WarehousesTableProps = {
  warehouses: Warehouse[];
  loading: boolean;
  pagination: DataPaginationProps;
  permissions: WarehouseActionPermissions;
  onViewDetail: (warehouse: Warehouse) => void;
  onViewStock: (warehouse: Warehouse) => void;
};

type WarehouseActionPermissions = {
  canViewDetail: boolean;
  canViewStock: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function WarehousesTable({ loading, onViewDetail, onViewStock, pagination, permissions, warehouses }: WarehousesTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Bodegas registradas</h3>
          <p className="mt-1 text-sm text-slate-500">Ubicaciones y disponibilidad consolidada.</p>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {loading ? "Cargando..." : `${pagination.totalItems.toLocaleString("es-CL")} bodegas`}
        </p>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {loading ? (
          <WarehouseMobileSkeleton />
        ) : (
          warehouses.map((warehouse) => (
            <WarehouseMobileCard
              key={warehouse.id}
              warehouse={warehouse}
              onViewDetail={onViewDetail}
              onViewStock={onViewStock}
              permissions={permissions}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[1080px] divide-y divide-slate-200 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              <TableHeader>Codigo</TableHeader>
              <TableHeader>Bodega</TableHeader>
              <TableHeader>Ubicacion</TableHeader>
              <TableHeader>Productos</TableHeader>
              <TableHeader>Stock total</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Ultima actualizacion</TableHeader>
              <TableHeader align="right" className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50/95 pl-4">
                Acciones
              </TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <WarehousesTableSkeleton />
            ) : (
              warehouses.map((warehouse) => (
                <WarehouseTableRow
                  key={warehouse.id}
                  warehouse={warehouse}
                  onViewDetail={onViewDetail}
                  onViewStock={onViewStock}
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

function WarehouseTableRow({
  onViewDetail,
  onViewStock,
  permissions,
  warehouse
}: {
  warehouse: Warehouse;
  onViewDetail: (warehouse: Warehouse) => void;
  onViewStock: (warehouse: Warehouse) => void;
  permissions: WarehouseActionPermissions;
}) {
  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/90">
      <TableCell>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-white">
          {warehouse.code}
        </span>
      </TableCell>
      <TableCell>
        <div className="max-w-[220px]">
          <p className="truncate font-semibold text-slate-950" title={warehouse.name}>
            {warehouse.name}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{warehouse.active ? "Operativa" : "Sin operacion"}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="line-clamp-2 max-w-[260px] text-slate-600">{warehouse.address ?? "No informado"}</span>
      </TableCell>
      <TableCell>
        <MetricValue value={warehouse.stockSummary.totalProducts} />
      </TableCell>
      <TableCell>
        <MetricValue value={warehouse.stockSummary.totalStock} />
      </TableCell>
      <TableCell>
        <WarehouseStatusBadge status={warehouse.status} />
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(warehouse.updatedAt)}</span>
      </TableCell>
      <TableCell align="right" className="sticky right-0 z-10 border-l border-slate-100 bg-white pl-4 transition-colors group-hover:bg-slate-50/95">
        <WarehouseActions warehouse={warehouse} onViewDetail={onViewDetail} onViewStock={onViewStock} permissions={permissions} />
      </TableCell>
    </tr>
  );
}

function WarehouseMobileCard({
  onViewDetail,
  onViewStock,
  permissions,
  warehouse
}: {
  warehouse: Warehouse;
  onViewDetail: (warehouse: Warehouse) => void;
  onViewStock: (warehouse: Warehouse) => void;
  permissions: WarehouseActionPermissions;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-150 hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {warehouse.code}
          </span>
          <h4 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">{warehouse.name}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{warehouse.address ?? "No informado"}</p>
        </div>
        <WarehouseStatusBadge status={warehouse.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MobileMetric label="Productos" value={formatNumber(warehouse.stockSummary.totalProducts)} />
        <MobileMetric label="Stock total" value={formatNumber(warehouse.stockSummary.totalStock)} />
        <MobileMetric label="Stock bajo" value={formatNumber(warehouse.stockSummary.lowStock)} />
        <MobileMetric label="Actualizacion" value={formatDate(warehouse.updatedAt)} />
      </div>

      <div className="mt-4">
        <WarehouseActions warehouse={warehouse} layout="full" onViewDetail={onViewDetail} onViewStock={onViewStock} permissions={permissions} />
      </div>
    </article>
  );
}

function WarehousesTableSkeleton() {
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

function WarehouseMobileSkeleton() {
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

function MetricValue({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-slate-500">Sin registros</span>;
  }

  return <span className="font-semibold text-slate-950">{formatNumber(value)}</span>;
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

function formatNumber(value: number): string {
  if (value === 0) {
    return "Sin registros";
  }

  return value.toLocaleString("es-CL");
}
