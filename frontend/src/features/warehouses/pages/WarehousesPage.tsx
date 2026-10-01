import { useState } from "react";
import { Plus, RadioTower, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ServiceStatusBanner } from "@/components/ui/ServiceStatusBanner";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toastContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ACTION_FORBIDDEN_TOAST_MESSAGE } from "@/features/auth/permissions/permissions";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import { WarehouseDetailDrawer } from "@/features/warehouses/components/WarehouseDetailDrawer";
import { WarehouseEmptyState } from "@/features/warehouses/components/WarehouseEmptyState";
import { WarehouseErrorState } from "@/features/warehouses/components/WarehouseErrorState";
import { WarehouseFormModal } from "@/features/warehouses/components/WarehouseFormModal";
import { WarehousesFilters } from "@/features/warehouses/components/WarehousesFilters";
import { WarehousesSummaryCards } from "@/features/warehouses/components/WarehousesSummaryCards";
import { WarehousesTable } from "@/features/warehouses/components/WarehousesTable";
import { useWarehouseDetail } from "@/features/warehouses/hooks/useWarehouseDetail";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import type { Warehouse, WarehouseFormValues } from "@/features/warehouses/types/warehouseTypes";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";

export function WarehousesPage() {
  const warehouses = useWarehouses();
  const detail = useWarehouseDetail();
  const systemStatus = useBackendStatus();
  const toast = useToast();
  const permissions = usePermissions();
  const [formOpen, setFormOpen] = useState(false);

  function handleViewDetail(warehouse: Warehouse) {
    if (!permissions.can("warehouses:view-detail")) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    void detail.openWarehouse(warehouse.id);
  }

  function handleViewStock(warehouse: Warehouse) {
    if (!permissions.can("warehouses:view-stock")) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    void detail.openWarehouse(warehouse.id);
  }

  async function handleCreateWarehouse(values: WarehouseFormValues) {
    if (!permissions.canCreateWarehouse()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    await warehouses.createWarehouse(values);
    toast.success("Bodega registrada correctamente.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Gestion de ubicaciones</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Bodegas</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Administra ubicaciones operativas y disponibilidad de stock.
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

            {permissions.canCreateWarehouse() ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Registrar bodega
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Registrar bodega</TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="secondary" onClick={() => void warehouses.refresh()} disabled={warehouses.refreshing}>
                  {warehouses.refreshing ? <Spinner size="sm" label="Actualizando bodegas" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar bodegas</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </section>

      <WarehousesSummaryCards summary={warehouses.summary} loading={warehouses.initialLoading} />

      <ServiceStatusBanner
        health={systemStatus.health}
        serviceKeys={["inventory"]}
        loading={warehouses.refreshing || systemStatus.loading}
        onRetry={() => void Promise.all([warehouses.refresh(), systemStatus.refresh()])}
      />

      <WarehousesFilters
        filters={warehouses.filters}
        warehouses={warehouses.warehouses}
        locations={warehouses.locations}
        loading={warehouses.refreshing}
        searching={warehouses.searching}
        hasActiveFilters={warehouses.hasActiveFilters}
        onChange={warehouses.updateFilters}
        onReset={warehouses.resetFilters}
        onRefresh={() => void warehouses.refresh()}
      />

      {warehouses.initialLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : warehouses.error ? (
        <WarehouseErrorState message={warehouses.error} loading={warehouses.refreshing} onRetry={() => void warehouses.refresh()} />
      ) : warehouses.isEmpty || warehouses.hasNoResults ? (
        <WarehouseEmptyState hasActiveFilters={warehouses.hasActiveFilters} onResetFilters={warehouses.resetFilters} />
      ) : (
        <WarehousesTable
          warehouses={warehouses.paginatedWarehouses}
          loading={false}
          pagination={warehouses.pagination}
          onViewDetail={handleViewDetail}
          onViewStock={handleViewStock}
          permissions={{
            canViewDetail: permissions.can("warehouses:view-detail"),
            canViewStock: permissions.can("warehouses:view-stock")
          }}
        />
      )}

      <WarehouseDetailDrawer warehouse={detail.warehouse} loading={detail.loading} error={detail.error} onClose={detail.closeWarehouse} />

      <WarehouseFormModal
        open={formOpen}
        saving={warehouses.saving}
        warehouses={warehouses.warehouses}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateWarehouse}
      />
    </div>
  );
}
