import { useState } from "react";
import { RadioTower, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ServiceStatusBanner } from "@/components/ui/ServiceStatusBanner";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toastContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ACTION_FORBIDDEN_TOAST_MESSAGE } from "@/features/auth/permissions/permissions";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import { ShipmentDetailDrawer } from "@/features/shipments/components/ShipmentDetailDrawer";
import { ShipmentEmptyState } from "@/features/shipments/components/ShipmentEmptyState";
import { ShipmentErrorState } from "@/features/shipments/components/ShipmentErrorState";
import { ShipmentStatusModal } from "@/features/shipments/components/ShipmentStatusModal";
import { ShipmentsFilters } from "@/features/shipments/components/ShipmentsFilters";
import { ShipmentsSummaryCards } from "@/features/shipments/components/ShipmentsSummaryCards";
import { ShipmentsTable } from "@/features/shipments/components/ShipmentsTable";
import { useShipmentDetail } from "@/features/shipments/hooks/useShipmentDetail";
import { useShipments } from "@/features/shipments/hooks/useShipments";
import type { Shipment, ShipmentStatus } from "@/features/shipments/types/shipmentTypes";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";

export function ShipmentsPage() {
  const shipments = useShipments();
  const detail = useShipmentDetail();
  const systemStatus = useBackendStatus();
  const toast = useToast();
  const permissions = usePermissions();
  const [statusShipment, setStatusShipment] = useState<Shipment | null>(null);
  const [cancelShipment, setCancelShipment] = useState<Shipment | null>(null);

  function handleViewDetail(shipment: Shipment) {
    if (!permissions.can("shipments:view-detail")) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    void detail.openShipment(shipment.id);
  }

  function handleRequestStatusChange(shipment: Shipment) {
    if (!permissions.canUpdateShipmentStatus()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    setStatusShipment(shipment);
  }

  function handleRequestCancel(shipment: Shipment) {
    if (!permissions.canCancelShipment()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    setCancelShipment(shipment);
  }

  async function handleUpdateStatus(input: { status: ShipmentStatus; comment?: string }) {
    if (!statusShipment) {
      return;
    }

    if (!permissions.canUpdateShipmentStatus()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    try {
      await shipments.updateShipmentStatus(statusShipment.id, input);
      toast.success("Estado actualizado correctamente.");
      setStatusShipment(null);
      detail.closeShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible completar la operacion.");
    }
  }

  async function handleCancelShipment() {
    if (!cancelShipment) {
      return;
    }

    if (!permissions.canCancelShipment()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    try {
      await shipments.cancelShipment(cancelShipment.id);
      toast.success("Envio cancelado correctamente.");
      setCancelShipment(null);
      detail.closeShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible completar la operacion.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Gestion de despachos</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Envios</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Consulta y administra el seguimiento de despachos registrados.
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
                <Button type="button" variant="secondary" onClick={() => void shipments.refresh()} disabled={shipments.refreshing}>
                  {shipments.refreshing ? <Spinner size="sm" label="Actualizando envios" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar envios</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </section>

      <ShipmentsSummaryCards summary={shipments.summary} loading={shipments.initialLoading} />

      <ServiceStatusBanner
        health={systemStatus.health}
        serviceKeys={["shipping"]}
        loading={shipments.refreshing || systemStatus.loading}
        onRetry={() => void Promise.all([shipments.refresh(), systemStatus.refresh()])}
      />

      <ShipmentsFilters
        filters={shipments.filters}
        shipments={shipments.shipments}
        carriers={shipments.carriers}
        loading={shipments.refreshing}
        searching={shipments.searching}
        hasActiveFilters={shipments.hasActiveFilters}
        onChange={shipments.updateFilters}
        onReset={shipments.resetFilters}
        onRefresh={() => void shipments.refresh()}
      />

      {shipments.saving && statusShipment ? (
        <div className="animate-soft-pulse inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
          <Spinner size="sm" label="Actualizando envio" />
          Actualizando envio...
        </div>
      ) : null}

      {shipments.initialLoading ? (
        <TableSkeleton rows={5} columns={8} />
      ) : shipments.error ? (
        <ShipmentErrorState message={shipments.error} loading={shipments.refreshing} onRetry={() => void shipments.refresh()} />
      ) : shipments.isEmpty || shipments.hasNoResults ? (
        <ShipmentEmptyState hasActiveFilters={shipments.hasActiveFilters} onResetFilters={shipments.resetFilters} />
      ) : (
        <ShipmentsTable
          shipments={shipments.paginatedShipments}
          loading={false}
          pagination={shipments.pagination}
          onViewDetail={handleViewDetail}
          onChangeStatus={handleRequestStatusChange}
          onCancel={handleRequestCancel}
          permissions={{
            canViewDetail: permissions.can("shipments:view-detail"),
            canUpdateStatus: permissions.canUpdateShipmentStatus(),
            canCancelShipment: permissions.canCancelShipment()
          }}
        />
      )}

      <ShipmentDetailDrawer
        shipment={detail.shipment}
        history={detail.history}
        loading={detail.loading}
        error={detail.error}
        onClose={detail.closeShipment}
        onChangeStatus={handleRequestStatusChange}
        onCancel={handleRequestCancel}
        permissions={{
          canUpdateStatus: permissions.canUpdateShipmentStatus(),
          canCancelShipment: permissions.canCancelShipment()
        }}
      />

      <ShipmentStatusModal
        shipment={statusShipment}
        loading={shipments.saving}
        onClose={() => setStatusShipment(null)}
        onConfirm={(input) => void handleUpdateStatus(input)}
      />

      <ConfirmDialog
        open={Boolean(cancelShipment)}
        title="Cancelar envio"
        description="Esta accion detendra el despacho seleccionado."
        confirmLabel="Cancelar envio"
        loading={shipments.saving}
        tone="danger"
        onClose={() => setCancelShipment(null)}
        onConfirm={() => void handleCancelShipment()}
      >
        {cancelShipment ? `${cancelShipment.shipmentNumber} quedara cancelado y conservara su historial.` : null}
      </ConfirmDialog>
    </div>
  );
}
