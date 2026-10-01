import type { ComponentPropsWithoutRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

type FormSkeletonProps = ComponentPropsWithoutRef<"div"> & {
  fields?: number;
  columns?: 1 | 2;
  showActions?: boolean;
};

export function FormSkeleton({ className, columns = 1, fields = 5, showActions = true, ...props }: FormSkeletonProps) {
  const fieldCount = toPositiveInteger(fields, 5);

  return (
    <div role="status" aria-label="Cargando formulario" className={cn("space-y-5", className)} {...props}>
      <span className="sr-only">Cargando formulario</span>
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
        {Array.from({ length: fieldCount }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton rounded="xl" className="h-12 w-full" />
          </div>
        ))}
      </div>

      {showActions ? (
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <Skeleton rounded="lg" className="h-10 w-full sm:w-28" />
          <Skeleton rounded="lg" className="h-10 w-full sm:w-32" />
        </div>
      ) : null}
    </div>
  );
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export type { FormSkeletonProps };
