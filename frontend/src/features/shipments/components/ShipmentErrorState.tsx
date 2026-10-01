import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ShipmentErrorStateProps = {
  message: string;
  loading: boolean;
  onRetry: () => void;
};

export function ShipmentErrorState({ loading, message, onRetry }: ShipmentErrorStateProps) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold text-red-950">No fue posible cargar envios</h3>
            <p className="mt-1 text-sm leading-6 text-red-800">{message}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={onRetry} disabled={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    </section>
  );
}
