import { useEffect, type ReactNode } from "react";
import { DataPagination } from "@/components/ui/data-pagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import { cn } from "@/utils/cn";

export type ReportTableColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

type ReportTableProps<T> = {
  title: string;
  description?: string;
  rows: T[];
  columns: Array<ReportTableColumn<T>>;
  getRowKey: (row: T) => string | number;
  emptyMessage?: string;
};

export function ReportTable<T>({ columns, description, emptyMessage = "Sin registros", getRowKey, rows, title }: ReportTableProps<T>) {
  const { paginatedItems, pagination, resetPage } = useClientPagination(rows);

  useEffect(() => {
    resetPage();
  }, [resetPage, rows]);

  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>

      {rows.length === 0 ? (
        <div className="p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{emptyMessage}</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                      column.align === "right" && "text-right"
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedItems.map((row) => (
                <tr key={getRowKey(row)} className="transition-colors duration-150 hover:bg-slate-50/90">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3 align-middle text-sm text-slate-700", column.align === "right" && "text-right")}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? <DataPagination {...pagination} /> : null}
    </section>
  );
}
