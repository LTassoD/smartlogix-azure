import { Eye, Pencil, Power, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { DataPagination, type DataPaginationProps } from "@/components/ui/data-pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InventoryStatusBadge } from "@/features/inventory/components/InventoryStatusBadge";
import type { InventoryItem } from "@/features/inventory/types/inventoryTypes";
import { cn } from "@/utils/cn";

type InventoryTableProps = {
  items: InventoryItem[];
  loading: boolean;
  pagination: DataPaginationProps;
  permissions: InventoryActionPermissions;
  onViewDetail: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onDeactivateProduct: (item: InventoryItem) => void;
};

type InventoryActionPermissions = {
  canViewDetail: boolean;
  canEditProduct: boolean;
  canAdjustStock: boolean;
  canDeactivateProduct: boolean;
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

export function InventoryTable({
  items,
  loading,
  pagination,
  onViewDetail,
  onEditProduct,
  onAdjustStock,
  onDeactivateProduct,
  permissions
}: InventoryTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Productos registrados</h3>
          <p className="mt-1 text-sm text-slate-500">Disponibilidad actual por producto.</p>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {loading ? "Cargando..." : `${pagination.totalItems.toLocaleString("es-CL")} productos`}
        </p>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {loading ? <InventoryMobileSkeleton /> : items.map((item) => (
          <InventoryMobileCard
            key={item.productId}
            item={item}
            onViewDetail={onViewDetail}
            onEditProduct={onEditProduct}
            onAdjustStock={onAdjustStock}
            onDeactivateProduct={onDeactivateProduct}
            permissions={permissions}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[980px] divide-y divide-slate-200 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr>
              <TableHeader>SKU</TableHeader>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Bodega</TableHeader>
              <TableHeader align="right">Stock</TableHeader>
              <TableHeader align="right">Precio</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Actualizacion</TableHeader>
              <TableHeader align="right" className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50/95 pl-4">
                Acciones
              </TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <InventoryTableSkeleton />
            ) : (
              items.map((item) => (
                <InventoryTableRow
                  key={item.productId}
                  item={item}
                  onViewDetail={onViewDetail}
                  onEditProduct={onEditProduct}
                  onAdjustStock={onAdjustStock}
                  onDeactivateProduct={onDeactivateProduct}
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

function InventoryTableRow({
  item,
  onViewDetail,
  onEditProduct,
  onAdjustStock,
  onDeactivateProduct,
  permissions
}: {
  item: InventoryItem;
  onViewDetail: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onDeactivateProduct: (item: InventoryItem) => void;
  permissions: InventoryActionPermissions;
}) {
  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/90">
      <TableCell>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-white">
          {item.sku}
        </span>
      </TableCell>
      <TableCell>
        <div className="max-w-[260px]">
          <p className="truncate font-semibold text-slate-950" title={item.name}>
            {item.name}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500" title={item.description?.trim() || "No informado"}>
            {item.description?.trim() || "No informado"}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <WarehouseCell item={item} />
      </TableCell>
      <TableCell align="right">
        <StockCell item={item} />
      </TableCell>
      <TableCell align="right">
        <span className="font-semibold tabular-nums text-slate-900">{currencyFormatter.format(item.unitPrice)}</span>
      </TableCell>
      <TableCell>
        <InventoryStatusBadge status={item.stockStatus} />
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-slate-600">{formatDate(item.updatedAt)}</span>
      </TableCell>
      <TableCell align="right" className="sticky right-0 z-10 border-l border-slate-100 bg-white pl-4 transition-colors group-hover:bg-slate-50/95">
        <div className="inline-flex min-w-[178px] justify-end gap-1.5">
          {permissions.canViewDetail ? <ActionIconButton icon={Eye} label="Ver detalle" onClick={() => onViewDetail(item)} /> : null}
          {permissions.canEditProduct ? <ActionIconButton icon={Pencil} label="Editar producto" onClick={() => onEditProduct(item)} /> : null}
          {permissions.canAdjustStock ? <ActionIconButton icon={SlidersHorizontal} label="Ajustar stock" onClick={() => onAdjustStock(item)} /> : null}
          {permissions.canDeactivateProduct ? (
            <ActionIconButton icon={Power} label="Desactivar producto" tone="danger" onClick={() => onDeactivateProduct(item)} disabled={!item.active} />
          ) : null}
        </div>
      </TableCell>
    </tr>
  );
}

function InventoryTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-5 py-5">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function InventoryMobileSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-5 w-44 animate-pulse rounded bg-slate-200" />
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

function InventoryMobileCard({
  item,
  onViewDetail,
  onEditProduct,
  onAdjustStock,
  onDeactivateProduct,
  permissions
}: {
  item: InventoryItem;
  onViewDetail: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onDeactivateProduct: (item: InventoryItem) => void;
  permissions: InventoryActionPermissions;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-150 hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {item.sku}
          </span>
          <h4 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">{item.name}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{item.description?.trim() || "No informado"}</p>
        </div>
        <InventoryStatusBadge status={item.stockStatus} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MobileMetric label="Stock" value={item.totalQuantity.toLocaleString("es-CL")} helper={`Minimo ${item.minimumStock.toLocaleString("es-CL")}`} />
        <MobileMetric label="Precio" value={currencyFormatter.format(item.unitPrice)} helper="Unitario" />
        <MobileMetric label="Bodega" value={getWarehouseName(item)} helper={getWarehouseHelper(item)} />
        <MobileMetric label="Actualizacion" value={formatDate(item.updatedAt)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {permissions.canViewDetail ? <ActionIconButton icon={Eye} label="Ver detalle" layout="full" onClick={() => onViewDetail(item)} /> : null}
        {permissions.canEditProduct ? <ActionIconButton icon={Pencil} label="Editar producto" layout="full" onClick={() => onEditProduct(item)} /> : null}
        {permissions.canAdjustStock ? (
          <ActionIconButton icon={SlidersHorizontal} label="Ajustar stock" layout="full" onClick={() => onAdjustStock(item)} />
        ) : null}
        {permissions.canDeactivateProduct ? (
          <ActionIconButton
            icon={Power}
            label="Desactivar producto"
            layout="full"
            tone="danger"
            onClick={() => onDeactivateProduct(item)}
            disabled={!item.active}
          />
        ) : null}
      </div>
    </article>
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
  return (
    <td className={cn("px-4 py-4 align-middle text-sm text-slate-700", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

function WarehouseCell({ item }: { item: InventoryItem }) {
  if (item.warehouseStocks.length === 0) {
    return <span className="text-slate-500">Sin bodega asignada</span>;
  }

  const [firstWarehouse] = item.warehouseStocks;

  return (
    <div className="max-w-[150px]">
      <p className="truncate font-semibold text-slate-800" title={firstWarehouse.warehouseName}>
        {firstWarehouse.warehouseName}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">
        {item.warehouseStocks.length === 1 ? firstWarehouse.warehouseCode : `${item.warehouseStocks.length} bodegas`}
      </p>
    </div>
  );
}

function getWarehouseName(item: InventoryItem): string {
  if (item.warehouseStocks.length === 0) {
    return "Sin bodega";
  }

  return item.warehouseStocks[0].warehouseName;
}

function getWarehouseHelper(item: InventoryItem): string {
  if (item.warehouseStocks.length === 0) {
    return "Sin disponibilidad";
  }

  if (item.warehouseStocks.length === 1) {
    return item.warehouseStocks[0].warehouseCode;
  }

  return `${item.warehouseStocks.length} bodegas`;
}

function StockCell({ item }: { item: InventoryItem }) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <span className="text-base font-semibold tabular-nums text-slate-950">{item.totalQuantity.toLocaleString("es-CL")}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
        Minimo {item.minimumStock.toLocaleString("es-CL")}
      </span>
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

function ActionIconButton({
  disabled,
  icon: Icon,
  label,
  layout = "icon",
  onClick,
  tone = "neutral"
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  layout?: "icon" | "full";
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  const button = (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "rounded-xl border-slate-300 text-slate-700 !shadow-none hover:-translate-y-0 hover:border-slate-400 hover:bg-slate-50 hover:!shadow-none focus-visible:ring-4",
        layout === "icon" ? "h-10 min-h-10 w-10 p-0" : "min-h-11 justify-start px-3 py-2 text-xs",
        tone === "danger" && "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-600/15",
        disabled && "hover:bg-white"
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Icon aria-hidden="true" absoluteStrokeWidth className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      {layout === "full" ? <span className="truncate">{label}</span> : null}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
