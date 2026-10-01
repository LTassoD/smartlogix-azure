import { useEffect, useState, type ReactNode } from "react";
import { Boxes, CalendarClock, Hash, MapPin, PackageSearch, Warehouse as WarehouseIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { FormMessage } from "@/components/ui/FormMessage";
import { WarehouseMovementsTable } from "@/features/warehouses/components/WarehouseMovementsTable";
import { WarehouseProductsTable } from "@/features/warehouses/components/WarehouseProductsTable";
import { WarehouseStatusBadge } from "@/features/warehouses/components/WarehouseStatusBadge";
import type { Warehouse } from "@/features/warehouses/types/warehouseTypes";

type WarehouseDetailDrawerProps = {
  warehouse: Warehouse | null;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function WarehouseDetailDrawer({ error, loading, onClose, warehouse }: WarehouseDetailDrawerProps) {
  const [renderWarehouse, setRenderWarehouse] = useState<Warehouse | null>(warehouse);
  const activeWarehouse = warehouse ?? renderWarehouse;

  useEffect(() => {
    if (warehouse) {
      setRenderWarehouse(warehouse);
    }
  }, [warehouse]);

  if (!activeWarehouse && !loading) {
    return null;
  }

  return (
    <Drawer
      open={Boolean(warehouse) || loading}
      onClose={onClose}
      title={loading && !activeWarehouse ? "Cargando informacion" : activeWarehouse?.name ?? "Detalle de bodega"}
      subtitle={activeWarehouse ? activeWarehouse.code : "Preparando detalle de la bodega."}
      className="max-w-4xl"
      footer={
        <div className="flex flex-col-reverse flex-wrap gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {loading && !activeWarehouse ? (
        <DetailSkeleton />
      ) : activeWarehouse ? (
        <div className="space-y-5">
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bodega</p>
                <h4 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeWarehouse.name}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activeWarehouse.address ?? "No informado"}</p>
              </div>
              <WarehouseStatusBadge status={activeWarehouse.status} />
            </div>
          </section>

          <DetailSection title="Informacion general">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={<Hash className="h-4 w-4" aria-hidden="true" />} label="Codigo" value={activeWarehouse.code} />
              <DetailMetric icon={<WarehouseIcon className="h-4 w-4" aria-hidden="true" />} label="Nombre" value={activeWarehouse.name} />
              <DetailMetric icon={<MapPin className="h-4 w-4" aria-hidden="true" />} label="Direccion" value={activeWarehouse.address ?? "No informado"} />
              <DetailMetric icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} label="Creacion" value={formatDate(activeWarehouse.createdAt)} />
              <DetailMetric
                icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                label="Ultima actualizacion"
                value={formatDate(activeWarehouse.updatedAt)}
              />
            </div>
          </DetailSection>

          <DetailSection title="Resumen de stock">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailMetric
                icon={<PackageSearch className="h-4 w-4" aria-hidden="true" />}
                label="Productos"
                value={formatMetric(activeWarehouse.stockSummary.totalProducts)}
              />
              <DetailMetric
                icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
                label="Stock total"
                value={formatMetric(activeWarehouse.stockSummary.totalStock)}
              />
              <DetailMetric label="Stock bajo" value={formatMetric(activeWarehouse.stockSummary.lowStock)} />
              <DetailMetric label="Sin stock" value={formatMetric(activeWarehouse.stockSummary.outOfStock)} />
            </div>
          </DetailSection>

          <DetailSection title="Productos asociados">
            <WarehouseProductsTable products={activeWarehouse.products} />
          </DetailSection>

          <DetailSection title="Movimientos recientes">
            <WarehouseMovementsTable movements={activeWarehouse.movements} />
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
  icon,
  label,
  value
}: {
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

function formatMetric(value: number): string {
  if (value === 0) {
    return "Sin registros";
  }

  return value.toLocaleString("es-CL");
}
