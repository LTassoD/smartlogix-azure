import { RotateCcw, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/Button";

type WarehouseEmptyStateProps = {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
};

export function WarehouseEmptyState({ hasActiveFilters, onResetFilters }: WarehouseEmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-panel">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Warehouse className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-950">
        {hasActiveFilters ? "No hay bodegas para estos filtros" : "No hay bodegas registradas"}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {hasActiveFilters
          ? "Ajusta la busqueda o limpia los filtros para ver otras ubicaciones."
          : "Cuando existan bodegas registradas, apareceran en esta vista con su stock asociado."}
      </p>
      {hasActiveFilters ? (
        <Button type="button" variant="secondary" className="mt-5" onClick={onResetFilters}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Limpiar filtros
        </Button>
      ) : null}
    </section>
  );
}
