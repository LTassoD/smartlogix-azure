import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ReportErrorStateProps = {
  message: string;
  loading: boolean;
  onRetry: () => void;
};

export function ReportErrorState({ loading, message, onRetry }: ReportErrorStateProps) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-950">No fue posible cargar reportes</h3>
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
