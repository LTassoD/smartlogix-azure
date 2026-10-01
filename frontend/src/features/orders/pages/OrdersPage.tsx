import { useState } from "react";
import { Plus, RadioTower, RefreshCw } from "lucide-react";
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
import { useCarriers } from "@/features/carriers/hooks/useCarriers";
import { OrderAssignCarrierModal } from "@/features/orders/components/OrderAssignCarrierModal";
import { OrderConfirmDialog } from "@/features/orders/components/OrderConfirmDialog";
import { OrderDetailDrawer } from "@/features/orders/components/OrderDetailDrawer";
import { OrderEmptyState } from "@/features/orders/components/OrderEmptyState";
import { OrderErrorState } from "@/features/orders/components/OrderErrorState";
import { OrderFormModal } from "@/features/orders/components/OrderFormModal";
import { OrdersFilters } from "@/features/orders/components/OrdersFilters";
import { OrdersSummaryCards } from "@/features/orders/components/OrdersSummaryCards";
import { OrdersTable } from "@/features/orders/components/OrdersTable";
import { useOrderDetail } from "@/features/orders/hooks/useOrderDetail";
import { useOrders, type RegisterOrderInput } from "@/features/orders/hooks/useOrders";
import type { Order, OrderStatus } from "@/features/orders/types/orderTypes";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getStatusTone, getSystemStatusLabel } from "@/lib/system/systemHealth";

type ConfirmAction =
  | { type: "confirm"; order: Order }
  | { type: "cancel"; order: Order }
  | { type: "status"; order: Order; statuses: OrderStatus[] };

export function OrdersPage() {
  const orders = useOrders();
  const carriers = useCarriers();
  const detail = useOrderDetail(orders.normalizerContext);
  const systemStatus = useBackendStatus();
  const toast = useToast();
  const permissions = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);

  async function handleRegisterOrder(input: RegisterOrderInput) {
    if (!permissions.canCreateOrder()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    await orders.registerOrder(input);
    toast.success("Pedido registrado correctamente.");
  }

  function handleViewOrder(order: Order) {
    if (!permissions.can("orders:view-detail")) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    void detail.openOrder(order.id);
  }

  function handleChangeStatus(order: Order) {
    if (!permissions.canChangeOrderStatus()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    const statuses = orders.getNextStatuses(order);

    if (statuses.length === 0) {
      return;
    }

    if (statuses.length === 1 && statuses[0] === "SHIPPED") {
      if (!permissions.canAssignCarrier()) {
        toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
        return;
      }

      setDispatchOrder(order);
      return;
    }

    setConfirmAction({ type: "status", order, statuses });
  }

  function handleRequestConfirm(order: Order) {
    if (!permissions.canValidateOrder()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    setConfirmAction({ type: "confirm", order });
  }

  function handleRequestCancel(order: Order) {
    if (!permissions.canCancelOrder()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    setConfirmAction({ type: "cancel", order });
  }

  async function handleConfirmAction(payload: { status?: OrderStatus; comment?: string }) {
    if (!confirmAction) {
      return;
    }

    try {
      if (confirmAction.type === "confirm") {
        if (!permissions.canValidateOrder()) {
          toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
          return;
        }

        await orders.confirmOrder(confirmAction.order);
        toast.success("Pedido confirmado correctamente.");
      }

      if (confirmAction.type === "cancel") {
        if (!permissions.canCancelOrder()) {
          toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
          return;
        }

        await orders.cancelOrder(confirmAction.order.id);
        toast.success("Pedido cancelado correctamente.");
      }

      if (confirmAction.type === "status" && payload.status) {
        if (!permissions.canChangeOrderStatus()) {
          toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
          return;
        }

        if (payload.status === "SHIPPED") {
          if (!permissions.canAssignCarrier()) {
            toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
            return;
          }

          setDispatchOrder(confirmAction.order);
          setConfirmAction(null);
          return;
        }

        await orders.updateOrderStatus(confirmAction.order.id, {
          status: payload.status,
          comment: payload.comment
        });
        toast.success("Estado actualizado correctamente.");
      }

      setConfirmAction(null);
      detail.closeOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la operacion.");
    }
  }

  async function handleDispatchOrder(input: { carrierCode: string; destinationCity?: string; comment?: string }) {
    if (!dispatchOrder) {
      return;
    }

    if (!permissions.canChangeOrderStatus() || !permissions.canAssignCarrier()) {
      toast.error(ACTION_FORBIDDEN_TOAST_MESSAGE);
      return;
    }

    try {
      await orders.dispatchOrder(dispatchOrder, input);
      toast.success("Transportista asignado al pedido.");
      setDispatchOrder(null);
      detail.closeOrder();
      void carriers.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible completar la operacion.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Gestion operacional</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Pedidos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Administra la validacion, estado y seguimiento de los pedidos registrados.
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
                <Button type="button" variant="secondary" onClick={() => void orders.refresh()} disabled={orders.refreshing}>
                  {orders.refreshing ? <Spinner size="sm" label="Actualizando pedidos" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar pedidos</TooltipContent>
            </Tooltip>

            {permissions.canCreateOrder() ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" onClick={() => setFormOpen(true)} disabled={orders.initialLoading}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Registrar pedido
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Registrar pedido</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </section>

      <OrdersSummaryCards summary={orders.summary} loading={orders.initialLoading} />

      <ServiceStatusBanner
        health={systemStatus.health}
        serviceKeys={["orders", "inventory"]}
        loading={orders.refreshing || systemStatus.loading}
        onRetry={() => void Promise.all([orders.refresh(), systemStatus.refresh()])}
      />

      {orders.referenceError && !orders.error ? (
        <FormMessage tone="info" title="Informacion parcial">
          Algunos datos de apoyo no estan disponibles. Puedes revisar pedidos registrados y actualizar nuevamente.
        </FormMessage>
      ) : null}

      {orders.dispatching ? (
        <div className="animate-soft-pulse inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
          <Spinner size="sm" label="Procesando despacho" />
          Procesando despacho...
        </div>
      ) : null}

      <OrdersFilters
        filters={orders.filters}
        orders={orders.orders}
        customers={orders.customers}
        warehouses={orders.warehouses}
        loading={orders.refreshing}
        searching={orders.searching}
        hasActiveFilters={orders.hasActiveFilters}
        onChange={orders.updateFilters}
        onReset={orders.resetFilters}
        onRefresh={() => void orders.refresh()}
      />

      {orders.initialLoading ? (
        <TableSkeleton rows={5} columns={8} />
      ) : orders.error ? (
        <OrderErrorState message={orders.error} loading={orders.refreshing} onRetry={() => void orders.refresh()} />
      ) : orders.isEmpty || orders.hasNoResults ? (
        <OrderEmptyState hasActiveFilters={orders.hasActiveFilters} onResetFilters={orders.resetFilters} />
      ) : (
        <OrdersTable
          orders={orders.paginatedOrders}
          loading={false}
          pagination={orders.pagination}
          getAvailability={orders.getAvailability}
          getNextStatuses={orders.getNextStatuses}
          onViewDetail={handleViewOrder}
          onConfirm={handleRequestConfirm}
          onChangeStatus={handleChangeStatus}
          onCancel={handleRequestCancel}
          permissions={{
            canViewDetail: permissions.can("orders:view-detail"),
            canValidateOrder: permissions.canValidateOrder(),
            canChangeStatus: permissions.canChangeOrderStatus(),
            canCancelOrder: permissions.canCancelOrder(),
            canAssignCarrier: permissions.canAssignCarrier()
          }}
        />
      )}

      <OrderFormModal
        open={formOpen}
        saving={orders.saving}
        customers={orders.customers}
        inventoryItems={orders.inventoryItems}
        warehouses={orders.warehouses}
        onClose={() => setFormOpen(false)}
        onSubmit={handleRegisterOrder}
      />

      <OrderDetailDrawer
        order={detail.order}
        loading={detail.loading}
        error={detail.error}
        getAvailability={orders.getAvailability}
        onClose={detail.closeOrder}
      />

      <OrderAssignCarrierModal
        order={dispatchOrder}
        carriers={carriers.carriers}
        loading={orders.dispatching || carriers.loading}
        onClose={() => setDispatchOrder(null)}
        onConfirm={(input) => void handleDispatchOrder(input)}
      />

      <OrderConfirmDialog
        action={confirmAction}
        loading={orders.saving}
        onClose={() => setConfirmAction(null)}
        onConfirm={(payload) => void handleConfirmAction(payload)}
      />
    </div>
  );
}
