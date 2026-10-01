import { useState } from "react";
import { Download, FileSpreadsheet, RadioTower, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { FormMessage } from "@/components/ui/FormMessage";
import { ServiceStatusBanner } from "@/components/ui/ServiceStatusBanner";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toastContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ACTION_FORBIDDEN_TOAST_MESSAGE } from "@/features/auth/permissions/permissions";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import { CarriersReportSection } from "@/features/reports/components/CarriersReportSection";
import { InventoryReportSection } from "@/features/reports/components/InventoryReportSection";
import { OrdersReportSection } from "@/features/reports/components/OrdersReportSection";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { ReportEmptyState } from "@/features/reports/components/ReportEmptyState";
import { ReportErrorState } from "@/features/reports/components/ReportErrorState";
import { ReportsFilters } from "@/features/reports/components/ReportsFilters";
import { ReportsSummaryCards } from "@/features/reports/components/ReportsSummaryCards";
import { ShipmentsReportSection } from "@/features/reports/components/ShipmentsReportSection";
import { WarehousesReportSection } from "@/features/reports/components/WarehousesReportSection";
import { useReports } from "@/features/reports/hooks/useReports";
import type { ReportType, ReportsData } from "@/features/reports/types/reportTypes";
import { exportReportCsv, exportReportXlsx } from "@/features/reports/utils/reportExport";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";

export function ReportsPage() {
  const reports = useReports();
  const systemStatus = useBackendStatus();
  const toast = useToast();
  const permissions = usePermissions();
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const hasExportData = !reports.initialLoading && !reports.error && reports.data.csvRows.length > 0 && !reports.isEmpty && !reports.hasNoResults;
  const canExport = permissions.canExportReports() && hasExportData && !exporting;

  function shouldShowSection(section: Exclude<ReportType, "general">): boolean {
    return reports.filters.reportType === "general" || reports.filters.reportType === section;
  }

  function canStartExport() {
    if (!permissions.canExportReports()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return false;
    }

    if (!canExport) {
      toast.error("No hay datos para exportar.");
      return false;
    }

    return true;
  }

  function handleExportCsv() {
    if (!canStartExport()) {
      return;
    }

    setExporting("csv");
    window.setTimeout(() => {
      try {
        exportReportCsv(reports.data.csvRows);
        toast.success("CSV exportado correctamente.");
      } finally {
        setExporting(null);
      }
    }, 0);
  }

  function handleExportExcel() {
    if (!canStartExport()) {
      return;
    }

    setExporting("xlsx");
    void exportReportXlsx(reports.data.csvRows, reports.filters)
      .then(() => toast.success("Excel exportado correctamente."))
      .catch(() => toast.error("No fue posible exportar el reporte."))
      .finally(() => setExporting(null));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Indicadores operacionales</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Reportes</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Visualiza indicadores operacionales de inventario, pedidos y despachos.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <RadioTower className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <StatusBadge
                  label={systemStatus.loading ? "Verificando" : getSystemStatusLabel(systemStatus.health?.status)}
                  tone={systemStatus.loading ? "neutral" : getStatusTone(systemStatus.health?.status)}
                />
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="secondary" onClick={() => void reports.refresh()} disabled={reports.refreshing}>
                  {reports.refreshing ? <Spinner size="sm" label="Actualizando reportes" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar reportes</TooltipContent>
            </Tooltip>

            {permissions.canExportReports() ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" onClick={handleExportExcel} disabled={!canExport}>
                      {exporting === "xlsx" ? (
                        <Spinner size="sm" label="Exportando Excel" className="text-current" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                      )}
                      {exporting === "xlsx" ? "Exportando..." : "Exportar Excel"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar reporte profesional</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="secondary" onClick={handleExportCsv} disabled={!canExport}>
                      {exporting === "csv" ? (
                        <Spinner size="sm" label="Exportando CSV" className="text-current" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      {exporting === "csv" ? "Exportando..." : "CSV"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar alternativa CSV</TooltipContent>
                </Tooltip>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <ReportsSummaryCards summary={reports.data.summary} loading={reports.initialLoading} />

      <ServiceStatusBanner
        health={systemStatus.health}
        serviceKeys={["inventory", "orders", "shipping"]}
        loading={reports.refreshing || systemStatus.loading}
        onRetry={() => void Promise.all([reports.refresh(), systemStatus.refresh()])}
      />

      <ReportsFilters
        filters={reports.filters}
        warehouses={reports.warehouses}
        carriers={reports.carriers}
        statusOptions={reports.statusOptions}
        loading={reports.refreshing}
        hasActiveFilters={reports.hasActiveFilters}
        onChange={reports.updateFilters}
        onReset={reports.resetFilters}
        onRefresh={() => void reports.refresh()}
      />

      {reports.referenceError && !reports.error ? (
        <FormMessage tone="info">Parte de la informacion de apoyo no esta disponible. Reintenta la actualizacion cuando los servicios vuelvan a operar.</FormMessage>
      ) : null}

      {reports.initialLoading ? (
        <ReportsInitialSkeleton />
      ) : reports.error ? (
        <ReportErrorState message={reports.error} loading={reports.refreshing} onRetry={() => void reports.refresh()} />
      ) : reports.isEmpty || reports.hasNoResults ? (
        <ReportEmptyState hasActiveFilters={reports.hasActiveFilters} onResetFilters={reports.resetFilters} />
      ) : (
        <div className="space-y-6">
          {reports.filters.reportType === "general" ? <GeneralReportSection data={reports.data} /> : null}
          {shouldShowSection("inventory") ? <InventoryReportSection report={reports.data.inventory} /> : null}
          {shouldShowSection("orders") ? <OrdersReportSection report={reports.data.orders} /> : null}
          {shouldShowSection("shipments") ? <ShipmentsReportSection report={reports.data.shipments} /> : null}
          {shouldShowSection("carriers") ? <CarriersReportSection report={reports.data.carriers} /> : null}
          {shouldShowSection("warehouses") ? <WarehousesReportSection report={reports.data.warehouses} /> : null}
        </div>
      )}
    </div>
  );
}

function ReportsInitialSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

function GeneralReportSection({ data }: { data: ReportsData }) {
  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportChartCard
          title="Resumen operacional"
          description="Indicadores principales calculados desde informacion disponible."
          data={[
            { label: "Productos registrados", value: data.summary.productsRegistered, tone: "blue" },
            { label: "Pedidos totales", value: data.summary.totalOrders, tone: "slate" },
            { label: "Envios en transito", value: data.summary.shipmentsInTransit, tone: "cyan" },
            { label: "Incidencias", value: data.summary.incidents, tone: "red" }
          ]}
        />
        <ReportChartCard
          title="Actividad reciente"
          description="Registros mas recientes por flujo operativo."
          data={[
            { label: "Ultimos pedidos", value: data.orders.latestOrders.length, tone: "blue" },
            { label: "Ultimos envios", value: data.shipments.latestShipments.length, tone: "cyan" },
            { label: "Movimientos de stock", value: data.warehouses.movements.length, tone: "green" }
          ]}
        />
      </div>
    </section>
  );
}

