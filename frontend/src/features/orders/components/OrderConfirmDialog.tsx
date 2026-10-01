import { useEffect, useState } from "react";
import { AlertTriangle, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import {
  getOrderStatusLabel,
  type Order,
  type OrderStatus
} from "@/features/orders/types/orderTypes";

type OrderConfirmAction =
  | {
      type: "confirm";
      order: Order;
    }
  | {
      type: "cancel";
      order: Order;
    }
  | {
      type: "status";
      order: Order;
      statuses: OrderStatus[];
    };

type OrderConfirmDialogProps = {
  action: OrderConfirmAction | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (payload: { status?: OrderStatus; comment?: string }) => void;
};

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function OrderConfirmDialog({ action, loading, onClose, onConfirm }: OrderConfirmDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (action?.type === "status") {
      setSelectedStatus(action.statuses[0] ?? "");
      setComment("");
    } else {
      setSelectedStatus("");
      setComment("");
    }
  }, [action]);

  if (!action) {
    return null;
  }

  const config = getDialogConfig(action);
  const isStatusAction = action.type === "status";

  return (
    <Modal
      open={Boolean(action)}
      onClose={onClose}
      title={config.title}
      subtitle={config.description}
      size="sm"
      closeDisabled={loading}
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={action.type === "cancel" ? "danger" : "primary"}
            onClick={() => onConfirm({ status: isStatusAction && selectedStatus ? selectedStatus : undefined, comment: comment.trim() || undefined })}
            disabled={loading || (isStatusAction && !selectedStatus)}
          >
            {loading ? <Spinner size="sm" label="Procesando pedido" className="text-current" /> : null}
            {loading ? "Procesando..." : config.confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" aria-hidden="true" />
          <div>{config.body}</div>
        </div>

        {isStatusAction ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              Nuevo estado
              <div className="relative">
                <GitBranch className="pointer-events-none absolute left-3 top-[2.6rem] h-4 w-4 text-slate-400" aria-hidden="true" />
                <select className={`${selectClassName} pl-10`} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}>
                  {action.statuses.map((status) => (
                    <option key={status} value={status}>
                      {getOrderStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              Comentario
              <textarea
                className="mt-2 block min-h-24 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={loading}
              />
            </label>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function getDialogConfig(action: OrderConfirmAction) {
  if (action.type === "confirm") {
    return {
      title: "Confirmar pedido",
      description: "Se confirmara el pedido para continuar con su preparacion.",
      confirmLabel: "Confirmar pedido",
      body: "Revisa que la informacion del pedido sea correcta antes de continuar."
    };
  }

  if (action.type === "cancel") {
    return {
      title: "Cancelar pedido",
      description: "Esta accion cambiara el estado del pedido y detendra su procesamiento.",
      confirmLabel: "Cancelar pedido",
      body: "El pedido quedara detenido y se conservara su trazabilidad."
    };
  }

  return {
    title: "Cambiar estado",
    description: "Selecciona el siguiente avance del pedido.",
    confirmLabel: "Actualizar estado",
    body: `Estado actual: ${getOrderStatusLabel(action.order.status)}.`
  };
}
