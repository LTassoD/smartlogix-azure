import type { WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { ReportTable, type ReportTableColumn } from "@/features/reports/components/ReportTable";
import type { WarehousesReport } from "@/features/reports/types/reportTypes";
import { WarehousesStockChart } from "@/features/reports/components/WarehousesStockChart";
import { WarehouseStatusBadge } from "@/features/warehouses/components/WarehouseStatusBadge";
import type { WarehouseMovement } from "@/features/warehouses/types/warehouseTypes";

type WarehousesReportSectionProps = {
  report: WarehousesReport;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function WarehousesReportSection({ report }: WarehousesReportSectionProps) {
  const warehouseColumns: Array<ReportTableColumn<WarehouseResponse>> = [
    {
      key: "code",
      header: "Codigo",
      render: (warehouse) => <span className="font-semibold text-slate-950">{warehouse.code}</span>
    },
    {
      key: "name",
      header: "Bodega",
      render: (warehouse) => warehouse.name
    },
    {
      key: "address",
      header: "Ubicacion",
      render: (warehouse) => warehouse.address ?? "No informado"
    },
    {
      key: "status",
      header: "Estado",
      render: (warehouse) => <WarehouseStatusBadge status={warehouse.active ? "ACTIVE" : "INACTIVE"} />
    }
  ];
  const movementColumns: Array<ReportTableColumn<WarehouseMovement>> = [
    {
      key: "date",
      header: "Fecha",
      render: (movement) => formatDate(movement.createdAt)
    },
    {
      key: "warehouse",
      header: "Bodega",
      render: (movement) => movement.warehouseName
    },
    {
      key: "product",
      header: "Producto",
      render: (movement) => movement.productName
    },
    {
      key: "type",
      header: "Tipo",
      render: (movement) => getMovementLabel(movement.type)
    },
    {
      key: "quantity",
      header: "Cantidad",
      align: "right",
      render: (movement) => movement.quantity.toLocaleString("es-CL")
    }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <WarehousesStockChart stockByWarehouse={report.stockByWarehouse} productsByWarehouse={report.productsByWarehouse} />
        <ReportChartCard
          title="Productos por bodega"
          description="Productos con stock registrado por ubicacion."
          data={report.productsByWarehouse}
        />
      </div>

      <ReportTable
        title="Bodegas registradas"
        description="Ubicaciones operativas disponibles."
        rows={report.warehouses}
        columns={warehouseColumns}
        getRowKey={(warehouse) => warehouse.id}
        emptyMessage="Sin bodegas registradas."
      />

      <ReportTable
        title="Movimientos recientes"
        description="Ultimos movimientos de stock registrados."
        rows={report.movements}
        columns={movementColumns}
        getRowKey={(movement) => movement.id}
        emptyMessage="Sin movimientos registrados."
      />
    </section>
  );
}

function getMovementLabel(type: WarehouseMovement["type"]): string {
  if (type === "IN") {
    return "Ingreso";
  }

  if (type === "OUT" || type === "ORDER_OUT") {
    return "Salida";
  }

  return "Ajuste";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No informado";
  }

  return dateFormatter.format(date);
}
