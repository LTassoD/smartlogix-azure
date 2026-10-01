import type { ComponentPropsWithoutRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

type DetailSkeletonProps = ComponentPropsWithoutRef<"div"> & {
  sections?: number;
  metrics?: number;
};

export function DetailSkeleton({ className, metrics = 4, sections = 3, ...props }: DetailSkeletonProps) {
  const metricCount = toPositiveInteger(metrics, 4);
  const sectionCount = toPositiveInteger(sections, 3);

  return (
    <div role="status" aria-label="Cargando detalle" className={cn("space-y-5", className)} {...props}>
      <span className="sr-only">Cargando detalle</span>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-48" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full" />
          </div>
          <Skeleton rounded="full" className="h-8 w-24" />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: metricCount }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton rounded="lg" className="h-8 w-8" />
            </div>
            <Skeleton className="mt-4 h-5 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>

      {Array.from({ length: sectionCount }).map((_, index) => (
        <section key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </section>
      ))}
    </div>
  );
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export type { DetailSkeletonProps };
