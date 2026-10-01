import type { ComponentPropsWithoutRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

type TableSkeletonProps = ComponentPropsWithoutRef<"div"> & {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
};

export function TableSkeleton({ className, columns = 6, rows = 5, showHeader = true, ...props }: TableSkeletonProps) {
  const rowCount = toPositiveInteger(rows, 5);
  const columnCount = toPositiveInteger(columns, 6);

  return (
    <div role="status" aria-label="Cargando tabla" className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel", className)} {...props}>
      <span className="sr-only">Cargando tabla</span>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-slate-200">
          {showHeader ? (
            <thead className="bg-slate-50">
              <tr>
                {Array.from({ length: columnCount }).map((_, columnIndex) => (
                  <th key={columnIndex} className="px-4 py-3 text-left">
                    <Skeleton className={cn("h-3", getHeaderWidth(columnIndex))} />
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columnCount }).map((__, columnIndex) => (
                  <td key={columnIndex} className="px-4 py-4">
                    <Skeleton className={cn("h-4", getCellWidth(rowIndex, columnIndex))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getHeaderWidth(columnIndex: number): string {
  const widths = ["w-24", "w-32", "w-20", "w-28"];
  return widths[columnIndex % widths.length] ?? "w-24";
}

function getCellWidth(rowIndex: number, columnIndex: number): string {
  const widths = ["w-36", "w-44", "w-28", "w-32", "w-24", "w-40"];
  return widths[(rowIndex + columnIndex) % widths.length] ?? "w-32";
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export type { TableSkeletonProps };
