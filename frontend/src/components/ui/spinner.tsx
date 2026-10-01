import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";

type SpinnerSize = "sm" | "md" | "lg";

type SpinnerProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  size?: SpinnerSize;
  label?: string;
  showLabel?: boolean;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6"
};

export function Spinner({ className, label = "Cargando", showLabel = false, size = "md", ...props }: SpinnerProps) {
  const statusLabel = label.trim() || "Cargando";

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex shrink-0 items-center justify-center gap-2 text-slate-500", className)}
      {...props}
    >
      <Loader2 className={cn("shrink-0 motion-safe:animate-spin motion-reduce:animate-none", sizeClasses[size])} aria-hidden="true" />
      {showLabel ? <span className="text-sm font-medium text-slate-600">{statusLabel}</span> : <span className="sr-only">{statusLabel}</span>}
    </span>
  );
}

export type { SpinnerProps, SpinnerSize };
