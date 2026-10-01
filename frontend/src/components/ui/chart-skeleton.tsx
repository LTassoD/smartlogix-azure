import type { ComponentPropsWithoutRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

type ChartSkeletonProps = ComponentPropsWithoutRef<"div"> & {
  bars?: number;
  showLegend?: boolean;
  showTitle?: boolean;
};

export function ChartSkeleton({ bars = 6, className, showLegend = true, showTitle = true, ...props }: ChartSkeletonProps) {
  const barCount = toPositiveInteger(bars, 6);

  return (
    <div role="status" aria-label="Cargando grafico" className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-panel", className)} {...props}>
      <span className="sr-only">Cargando grafico</span>
      {showTitle ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      ) : null}

      <div className="mt-6 flex h-56 items-end gap-3 border-b border-l border-slate-200 px-3 pb-3">
        {Array.from({ length: barCount }).map((_, index) => (
          <Skeleton key={index} rounded="lg" className={cn("flex-1", getBarHeight(index))} />
        ))}
      </div>

      {showLegend ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {Array.from({ length: Math.min(barCount, 4) }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton rounded="full" className="h-2.5 w-2.5" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getBarHeight(index: number): string {
  const heights = ["h-20", "h-32", "h-24", "h-44", "h-36", "h-28"];
  return heights[index % heights.length] ?? "h-28";
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export type { ChartSkeletonProps };
