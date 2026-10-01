import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";

type OrderEmptyStateProps = {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
};

export function OrderEmptyState({ hasActiveFilters, onResetFilters }: OrderEmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-panel transition-all duration-200 hover:border-slate-400 hover:shadow-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <ClipboardList className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">
        {hasActiveFilters ? "No se encontraron pedidos" : "Sin pedidos registrados"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {hasActiveFilters ? "Ajusta los filtros para ampliar la busqueda." : "Cuando existan pedidos registrados, apareceran en este listado."}
      </p>
      {hasActiveFilters ? (
        <Button type="button" variant="secondary" className="mt-5" onClick={onResetFilters}>
          Limpiar filtros
        </Button>
      ) : null}
    </section>
  );
}
