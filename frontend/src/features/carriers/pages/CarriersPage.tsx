import { RadioTower, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ServiceStatusBanner } from "@/components/ui/ServiceStatusBanner";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toastContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ACTION_FORBIDDEN_TOAST_MESSAGE } from "@/features/auth/permissions/permissions";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import { CarrierConfirmDialog } from "@/features/carriers/components/CarrierConfirmDialog";
import { CarrierDetailDrawer } from "@/features/carriers/components/CarrierDetailDrawer";
import { CarrierEmptyState } from "@/features/carriers/components/CarrierEmptyState";
import { CarrierErrorState } from "@/features/carriers/components/CarrierErrorState";
import { CarriersFilters } from "@/features/carriers/components/CarriersFilters";
import { CarriersSummaryCards } from "@/features/carriers/components/CarriersSummaryCards";
import { CarriersTable } from "@/features/carriers/components/CarriersTable";
import { useCarrierDetail } from "@/features/carriers/hooks/useCarrierDetail";
import { useCarriers } from "@/features/carriers/hooks/useCarriers";
import type { Carrier } from "@/features/carriers/types/carrierTypes";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";
import { useState } from "react";

export function CarriersPage() {
  const carriers = useCarriers();
  const detail = useCarrierDetail();
  const systemStatus = useBackendStatus();
  const toast = useToast();
  const permissions = usePermissions();
  const [availabilityCarrier, setAvailabilityCarrier] = useState<Carrier | null>(null);

  function handleViewDetail(carrier: Carrier) {
    if (!permissions.can("carriers:view-detail")) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    void detail.openCarrier(carrier.id);
  }

  function handleRequestAvailabilityChange(carrier: Carrier) {
    if (!permissions.canUpdateCarrierAvailability()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    setAvailabilityCarrier(carrier);
  }

  async function handleToggleAvailability() {
    if (!availabilityCarrier) {
      return;
    }

    if (!permissions.canUpdateCarrierAvailability()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    try {
      const nextAvailable = !availabilityCarrier.simulatedAvailable;
      await carriers.updateAvailability(availabilityCarrier, nextAvailable);
      toast.success(nextAvailable ? "Transportista disponible." : "Transportista marcado como no disponible.");
      setAvailabilityCarrier(null);
      detail.closeCarrier();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible completar la operacion.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Gestion logistica</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Transportistas</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Administra proveedores de despacho y disponibilidad logistica.
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
                <Button type="button" variant="secondary" onClick={() => void carriers.refresh()} disabled={carriers.refreshing}>
                  {carriers.refreshing ? <Spinner size="sm" label="Actualizando transportistas" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar transportistas</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </section>

      <CarriersSummaryCards summary={carriers.summary} loading={carriers.initialLoading} />

      <ServiceStatusBanner
        health={systemStatus.health}
        serviceKeys={["shipping"]}
        loading={carriers.refreshing || systemStatus.loading}
        onRetry={() => void Promise.all([carriers.refresh(), systemStatus.refresh()])}
      />

      {carriers.referenceError && !carriers.error ? (
        <FormMessage tone="info" title="Informacion parcial">
          Los transportistas estan disponibles, pero algunos despachos asociados no pudieron cargarse.
        </FormMessage>
      ) : null}

      <CarriersFilters
        filters={carriers.filters}
        carriers={carriers.carriers}
        serviceTypes={carriers.serviceTypes}
        loading={carriers.refreshing}
        searching={carriers.searching}
        hasActiveFilters={carriers.hasActiveFilters}
        onChange={carriers.updateFilters}
        onReset={carriers.resetFilters}
        onRefresh={() => void carriers.refresh()}
      />

      {carriers.initialLoading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : carriers.error ? (
        <CarrierErrorState message={carriers.error} loading={carriers.refreshing} onRetry={() => void carriers.refresh()} />
      ) : carriers.isEmpty || carriers.hasNoResults ? (
        <CarrierEmptyState hasActiveFilters={carriers.hasActiveFilters} onResetFilters={carriers.resetFilters} />
      ) : (
        <CarriersTable
          carriers={carriers.paginatedCarriers}
          loading={false}
          pagination={carriers.pagination}
          onViewDetail={handleViewDetail}
          onToggleAvailability={handleRequestAvailabilityChange}
          permissions={{
            canViewDetail: permissions.can("carriers:view-detail"),
            canUpdateAvailability: permissions.canUpdateCarrierAvailability()
          }}
        />
      )}

      <CarrierDetailDrawer
        carrier={detail.carrier}
        shipments={detail.shipments}
        history={detail.history}
        loading={detail.loading}
        error={detail.error}
        onClose={detail.closeCarrier}
        onToggleAvailability={handleRequestAvailabilityChange}
        permissions={{
          canUpdateAvailability: permissions.canUpdateCarrierAvailability()
        }}
      />

      <CarrierConfirmDialog
        carrier={availabilityCarrier}
        loading={carriers.saving}
        onClose={() => setAvailabilityCarrier(null)}
        onConfirm={() => void handleToggleAvailability()}
      />
    </div>
  );
}
