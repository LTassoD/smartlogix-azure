import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ToastContext } from "@/components/ui/toastContext";
import { cn } from "@/utils/cn";

type ToastTone = "success" | "error";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

const toastDurationMs = 3600;

const toneClasses: Record<ToastTone, string> = {
  success: "border-green-200 bg-white text-green-900 shadow-green-950/10",
  error: "border-red-200 bg-white text-red-900 shadow-red-950/10"
};

const iconClasses: Record<ToastTone, string> = {
  success: "text-green-600",
  error: "text-red-600"
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.round(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, message }]);
  }, []);

  const value = useMemo(
    () => ({
      success: (message: string) => show("success", message),
      error: (message: string) => show("error", message)
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(<ToastViewport dismiss={dismiss} toasts={toasts} />, document.body)}
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[10000] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, toastDurationMs);

    return () => window.clearTimeout(timeout);
  }, [onDismiss]);

  const Icon = toast.tone === "success" ? CheckCircle2 : XCircle;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl transition-all duration-200 ease-out",
        toneClasses[toast.tone]
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClasses[toast.tone])} aria-hidden="true" />
      <p className="flex-1 text-sm font-semibold leading-6 text-slate-800">{toast.message}</p>
      <Button type="button" variant="ghost" className="min-h-8 px-2 text-slate-500" onClick={onDismiss} aria-label="Cerrar mensaje">
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
