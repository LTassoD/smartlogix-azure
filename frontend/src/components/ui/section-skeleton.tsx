import type { ComponentPropsWithoutRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

type SectionSkeletonProps = ComponentPropsWithoutRef<"section"> & {
  lines?: number;
  showHeader?: boolean;
  actions?: number;
};

export function SectionSkeleton({ actions = 0, className, lines = 3, showHeader = true, ...props }: SectionSkeletonProps) {
  const lineCount = toPositiveInteger(lines, 3);
  const actionCount = Math.max(0, Math.floor(actions));

  return (
    <section role="status" aria-label="Cargando seccion" className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-panel", className)} {...props}>
      <span className="sr-only">Cargando seccion</span>
      {showHeader ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          {actionCount > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: actionCount }).map((_, index) => (
                <Skeleton key={index} rounded="lg" className="h-10 w-28" />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn(showHeader && "mt-6", "space-y-3")}>
        {Array.from({ length: lineCount }).map((_, index) => (
          <Skeleton key={index} className={cn("h-4", getLineWidth(index))} />
        ))}
      </div>
    </section>
  );
}

function getLineWidth(index: number): string {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3"];
  return widths[index % widths.length] ?? "w-full";
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export type { SectionSkeletonProps };
