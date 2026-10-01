import { CarrierStatusBadge } from "@/features/carriers/components/CarrierStatusBadge";
import { getCarrierStatus, type ApiCarrier } from "@/features/carriers/types/carrierTypes";
import { CarriersPerformanceChart } from "@/features/reports/components/CarriersPerformanceChart";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { ReportTable, type ReportTableColumn } from "@/features/reports/components/ReportTable";
import type { CarriersReport } from "@/features/reports/types/reportTypes";

type CarriersReportSectionProps = {
  report: CarriersReport;
};

export function CarriersReportSection({ report }: CarriersReportSectionProps) {
  const columns: Array<ReportTableColumn<ApiCarrier>> = [
    {
      key: "code",
      header: "Codigo",
      render: (carrier) => <span className="font-semibold text-slate-950">{carrier.code}</span>
    },
    {
      key: "name",
      header: "Transportista",
      render: (carrier) => carrier.name
    },
    {
      key: "service",
      header: "Servicio",
      render: (carrier) => carrier.serviceType ?? "No informado"
    },
    {
      key: "status",
      header: "Estado",
      render: (carrier) => <CarrierStatusBadge status={getCarrierStatus(carrier)} />
    }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <CarriersPerformanceChart report={report} />
        <ReportChartCard
          title="Resumen de transportistas"
          description="Disponibilidad operacional registrada."
          data={[
            { label: "Activos", value: report.activeCarriers, tone: "green" },
            { label: "No disponibles", value: report.unavailableCarriers, tone: "yellow" }
          ]}
        />
      </div>

      <ReportTable
        title="Transportistas registrados"
        description="Disponibilidad actual segun informacion real."
        rows={report.carriers}
        columns={columns}
        getRowKey={(carrier) => carrier.id}
        emptyMessage="Sin transportistas registrados."
      />
    </section>
  );
}
