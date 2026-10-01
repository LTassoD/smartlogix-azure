import type { ComponentPropsWithoutRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

type CardSkeletonColumns = "auto" | 1 | 2 | 3 | 4;

type CardSkeletonProps = ComponentPropsWithoutRef<"div"> & {
  count?: number;
  columns?: CardSkeletonColumns;
  compact?: boolean;
};

const columnClasses: Record<CardSkeletonColumns, string> = {
  auto: "sm:grid-cols-2 xl:grid-cols-4",
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4"
};

export function CardSkeleton({ className, columns = "auto", compact = false, count = 4, ...props }: CardSkeletonProps) {
  const cardCount = toPositiveInteger(count, 4);

  return (
    <div role="status" aria-label="Cargando tarjetas" className={cn("grid gap-4", columnClasses[columns], className)} {...props}>
      <span className="sr-only">Cargando tarjetas</span>
      {Array.from({ length: cardCount }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className={cn("mt-4 h-7", compact ? "w-20" : "w-28")} />
            </div>
            <Skeleton rounded="lg" className="h-10 w-10" />
          </div>
          {compact ? null : (
            <div className="mt-5 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export type { CardSkeletonColumns, CardSkeletonProps };
