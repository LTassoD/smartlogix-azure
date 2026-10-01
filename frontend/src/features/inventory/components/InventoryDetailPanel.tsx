import { useEffect, useState, type ReactNode } from "react";
import { Building2, CalendarClock, DollarSign, PackageCheck, Pencil, Power, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { FormMessage } from "@/components/ui/FormMessage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InventoryStatusBadge } from "@/features/inventory/components/InventoryStatusBadge";
import type { InventoryItem } from "@/features/inventory/types/inventoryTypes";
import { cn } from "@/utils/cn";

type InventoryDetailPanelProps = {
  item: InventoryItem | null;
  loading: boolean;
  error?: string | null;
  permissions: {
    canEditProduct: boolean;
    canAdjustStock: boolean;
    canDeactivateProduct: boolean;
  };
  onClose: () => void;
  onEditProduct: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onDeactivateProduct: (item: InventoryItem) => void;
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

export function InventoryDetailPanel({
  item,
  loading,
  error,
  permissions,
  onClose,
  onEditProduct,
  onAdjustStock,
  onDeactivateProduct
}: InventoryDetailPanelProps) {
  const [renderItem, setRenderItem] = useState<InventoryItem | null>(item);
  const activeItem = item ?? renderItem;

  useEffect(() => {
    if (item) {
      setRenderItem(item);
    }
  }, [item]);

  if (!activeItem && !loading) {
    return null;
  }

  return (
    <Drawer
      open={Boolean(item) || loading}
      onClose={onClose}
      title={loading && !activeItem ? "Cargando informacion" : activeItem?.name ?? "Detalle de producto"}
      subtitle={activeItem ? `SKU ${activeItem.sku}` : "Preparando detalle del producto."}
      footer={
        <div className="flex flex-col-reverse flex-wrap gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {permissions.canEditProduct ? (
            <Button type="button" variant="secondary" onClick={() => activeItem && onEditProduct(activeItem)} disabled={!activeItem || loading}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
          ) : null}
          {permissions.canAdjustStock ? (
            <Button type="button" onClick={() => activeItem && onAdjustStock(activeItem)} disabled={!activeItem || loading}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Ajustar stock
            </Button>
          ) : null}
          {permissions.canDeactivateProduct ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => activeItem && onDeactivateProduct(activeItem)}
              disabled={!activeItem || loading || !activeItem.active}
            >
              <Power className="h-4 w-4" aria-hidden="true" />
              Desactivar
            </Button>
          ) : null}
        </div>
      }
    >
      {loading && !activeItem ? (
        <DetailSkeleton />
      ) : activeItem ? (
        <div className="space-y-5">
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</p>
                <h4 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeItem.name}</h4>
                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  SKU {activeItem.sku}
                </p>
              </div>
              <InventoryStatusBadge status={activeItem.stockStatus} />
            </div>
          </section>

          <DetailSection title="Informacion general">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripcion</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{activeItem.description?.trim() || "No informado"}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<DollarSign className="h-4 w-4" aria-hidden="true" />} label="Precio" value={currencyFormatter.format(activeItem.unitPrice)} />
              <DetailMetric
                icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
                label="Estado"
                value={activeItem.active ? "Activo" : "Inactivo"}
              />
              <DetailMetric
                icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                label="Ultima actualizacion"
                value={formatDate(activeItem.updatedAt)}
                className="sm:col-span-2"
              />
            </div>
          </DetailSection>

          <DetailSection title="Stock">
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailMetric label="Stock total" value={activeItem.totalQuantity.toLocaleString("es-CL")} />
              <DetailMetric label="Stock minimo" value={activeItem.minimumStock.toLocaleString("es-CL")} />
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado de stock</p>
                <div className="mt-3">
                  <InventoryStatusBadge status={activeItem.stockStatus} />
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Disponibilidad por bodega">
            {activeItem.warehouseStocks.length > 0 ? (
              <div className="space-y-3">
                {activeItem.warehouseStocks.map((stock) => (
                  <div
                    key={stock.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{stock.warehouseName || "No informado"}</p>
                          <p className="mt-1 text-sm text-slate-500">{stock.warehouseCode || "No informado"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-right sm:min-w-48">
                        <WarehouseMetric label="Stock" value={stock.quantity} criticalWhenZero />
                        <WarehouseMetric label="Minimo" value={stock.minimumStock} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
                Sin disponibilidad registrada
              </div>
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
  label,
  value,
  icon,
  className
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className="mt-2 text-base font-semibold text-slate-950">{value || "No informado"}</p>
    </div>
  );
}

function WarehouseMetric({ label, value, criticalWhenZero = false }: { label: string; value: number; criticalWhenZero?: boolean }) {
  const tone = criticalWhenZero && value <= 0 ? "danger" : "neutral";

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1">
        <StatusBadge label={value.toLocaleString("es-CL")} tone={tone} />
      </div>
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
