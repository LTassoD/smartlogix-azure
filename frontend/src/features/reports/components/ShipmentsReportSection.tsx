import { ShipmentStatusBadge } from "@/features/shipments/components/ShipmentStatusBadge";
import { getShipmentCustomerDisplayName } from "@/features/shipments/utils/shipmentCustomer";
import type { Shipment } from "@/features/carriers/types/carrierTypes";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { ReportTable, type ReportTableColumn } from "@/features/reports/components/ReportTable";
import { ShipmentsStatusChart } from "@/features/reports/components/ShipmentsStatusChart";
import type { ShipmentsReport } from "@/features/reports/types/reportTypes";

type ShipmentsReportSectionProps = {
  report: ShipmentsReport;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function ShipmentsReportSection({ report }: ShipmentsReportSectionProps) {
  const columns: Array<ReportTableColumn<Shipment>> = [
    {
      key: "shipment",
      header: "Envio",
      render: (shipment) => <span className="font-semibold text-slate-950">{shipment.shipmentNumber}</span>
    },
    {
      key: "order",
      header: "Pedido",
      render: (shipment) => shipment.orderNumber
    },
    {
      key: "customer",
      header: "Cliente",
      render: (shipment) => getShipmentCustomerDisplayName(shipment)
    },
    {
      key: "carrier",
      header: "Transportista",
      render: (shipment) => shipment.carrier?.name ?? "Sin asignar"
    },
    {
      key: "status",
      header: "Estado",
      render: (shipment) => <ShipmentStatusBadge status={shipment.status} />
    },
    {
      key: "date",
      header: "Fecha",
      render: (shipment) => formatDate(shipment.createdAt)
    }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <ShipmentsStatusChart data={report.shipmentsByStatus} />
        <ReportChartCard
          title="Resumen de envios"
          description="Seguimiento logistico consolidado."
          data={[
            { label: "Total de envios", value: report.totalShipments, tone: "blue" },
            { label: "En transito", value: report.inTransitShipments, tone: "cyan" },
            { label: "Entregados", value: report.deliveredShipments, tone: "green" },
            { label: "Incidencias", value: report.incidentShipments, tone: "red" }
          ]}
        />
      </div>

      <ReportTable
        title="Ultimos envios registrados"
        description="Despachos recientes disponibles en el sistema."
        rows={report.latestShipments}
        columns={columns}
        getRowKey={(shipment) => shipment.id}
        emptyMessage="Sin envios registrados."
      />

      <ReportTable
        title="Envios sin transportista"
        description="Despachos que aun no tienen asignacion."
        rows={report.unassignedShipments}
        columns={columns}
        getRowKey={(shipment) => shipment.id}
        emptyMessage="No hay envios sin transportista."
      />
    </section>
  );
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
