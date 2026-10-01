import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type InventoryErrorStateProps = {
  message: string;
  loading: boolean;
  onRetry: () => void;
};

export function InventoryErrorState({ message, loading, onRetry }: InventoryErrorStateProps) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-panel transition-all duration-200 hover:border-red-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">No fue posible cargar la informacion</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">{message}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={onRetry} disabled={loading}>
          Reintentar
        </Button>
      </div>
    </section>
  );
}
