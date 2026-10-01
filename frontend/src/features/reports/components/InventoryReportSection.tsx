import { InventoryCriticalChart } from "@/features/reports/components/InventoryCriticalChart";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { ReportTable, type ReportTableColumn } from "@/features/reports/components/ReportTable";
import type { InventoryReport } from "@/features/reports/types/reportTypes";
import type { InventoryItem } from "@/features/inventory/types/inventoryTypes";

type InventoryReportSectionProps = {
  report: InventoryReport;
};

export function InventoryReportSection({ report }: InventoryReportSectionProps) {
  const columns: Array<ReportTableColumn<InventoryItem>> = [
    {
      key: "sku",
      header: "SKU",
      render: (item) => <span className="font-semibold text-slate-950">{item.sku}</span>
    },
    {
      key: "name",
      header: "Producto",
      render: (item) => (
        <div className="max-w-[260px]">
          <p className="truncate font-semibold text-slate-950" title={item.name}>
            {item.name}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{item.description ?? "No informado"}</p>
        </div>
      )
    },
    {
      key: "stock",
      header: "Stock total",
      align: "right",
      render: (item) => item.totalQuantity.toLocaleString("es-CL")
    },
    {
      key: "minimum",
      header: "Minimo",
      align: "right",
      render: (item) => item.minimumStock.toLocaleString("es-CL")
    },
    {
      key: "status",
      header: "Estado",
      render: (item) => getStockLabel(item.stockStatus)
    }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <InventoryCriticalChart products={report.criticalProducts} />
        <ReportChartCard
          title="Resumen de inventario"
          description="Alertas principales sobre disponibilidad."
          data={[
            { label: "Stock total", value: report.totalStock, tone: "blue" },
            { label: "Stock bajo", value: report.lowStockProducts.length, tone: "yellow" },
            { label: "Sin stock", value: report.outOfStockProducts.length, tone: "red" }
          ]}
        />
      </div>

      <ReportTable
        title="Productos criticos"
        description="Productos con stock bajo o sin stock."
        rows={report.criticalProducts}
        columns={columns}
        getRowKey={(item) => item.productId}
        emptyMessage="No hay productos criticos."
      />
    </section>
  );
}

function getStockLabel(status: InventoryItem["stockStatus"]) {
  if (status === "out") {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-600/20">Sin stock</span>;
  }

  if (status === "low") {
    return <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800 ring-1 ring-yellow-600/20">Stock bajo</span>;
  }

  if (status === "inactive") {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-500/20">Inactivo</span>;
  }

  return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20">Disponible</span>;
}
