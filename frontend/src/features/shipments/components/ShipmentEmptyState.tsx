import { PackageSearch, SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ShipmentEmptyStateProps = {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
};

export function ShipmentEmptyState({ hasActiveFilters, onResetFilters }: ShipmentEmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-panel">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {hasActiveFilters ? <SearchX className="h-6 w-6" aria-hidden="true" /> : <PackageSearch className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{hasActiveFilters ? "Sin coincidencias" : "No hay envios registrados"}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {hasActiveFilters ? "Ajusta los filtros para revisar otros despachos." : "Cuando existan envios registrados, apareceran en esta vista."}
      </p>
      {hasActiveFilters ? (
        <Button type="button" variant="secondary" className="mt-5" onClick={onResetFilters}>
          Limpiar filtros
        </Button>
      ) : null}
    </section>
  );
}
