import type { ComponentPropsWithoutRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";

type PageLoaderProps = ComponentPropsWithoutRef<"div"> & {
  label?: string;
  description?: string;
};

export function PageLoader({
  className,
  description = "Preparando la informacion de tu cuenta.",
  label = "Verificando sesion...",
  ...props
}: PageLoaderProps) {
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center px-4 py-10", className)} {...props}>
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-panel">
        <Spinner size="lg" label={label} />
        <p className="mt-4 text-sm font-semibold text-slate-950">{label}</p>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

export type { PageLoaderProps };
