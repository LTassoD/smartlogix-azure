import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/spinner";
import { getServiceStatusLabel } from "@/lib/system/systemHealth";
import { cn } from "@/utils/cn";

type SystemServiceAlertProps = {
  serviceName: string;
  status: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

export function SystemServiceAlert({
  className,
  isRetrying = false,
  message,
  onRetry,
  serviceName,
  status
}: SystemServiceAlertProps) {
  const unavailable = status === "DOWN" || status === "OUT_OF_SERVICE" || status === "UNKNOWN";
  const title = unavailable ? "Servicio no disponible" : "Disponibilidad parcial";
  const statusLabel = getServiceStatusLabel(status);

  return (
    <article
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left text-slate-900 shadow-panel",
        "flex items-start justify-start",
        "sm:p-5",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start justify-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 justify-self-start text-left">
          <p className="break-words text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 break-words text-sm font-medium text-slate-700">{serviceName}</p>
          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-300">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </span>

          <p className="mt-3 max-w-full break-words text-sm leading-6 text-slate-700">{message}</p>

          {onRetry ? (
            <div className="mt-4 flex justify-start">
              <Button type="button" variant="secondary" className="w-full whitespace-nowrap sm:w-auto" onClick={onRetry} disabled={isRetrying}>
                {isRetrying ? <Spinner size="sm" label="Reintentando" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                {isRetrying ? "Reintentando..." : "Reintentar"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
