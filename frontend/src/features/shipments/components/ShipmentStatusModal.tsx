import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import {
  getShipmentNextStatuses,
  getShipmentStatusLabel,
  type Shipment,
  type ShipmentStatus
} from "@/features/shipments/types/shipmentTypes";

type ShipmentStatusModalProps = {
  shipment: Shipment | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (input: { status: ShipmentStatus; comment?: string }) => void;
};

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function ShipmentStatusModal({ loading, onClose, onConfirm, shipment }: ShipmentStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | "">("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (shipment) {
      setSelectedStatus(getShipmentNextStatuses(shipment.status)[0] ?? "");
      setComment("");
    }
  }, [shipment]);

  if (!shipment) {
    return null;
  }

  const nextStatuses = getShipmentNextStatuses(shipment.status);
  const hasNextStatuses = nextStatuses.length > 0;

  function handleSubmit() {
    if (!selectedStatus) {
      return;
    }

    onConfirm({
      status: selectedStatus,
      comment: comment.trim() || undefined
    });
  }

  return (
    <Modal
      open={Boolean(shipment)}
      onClose={onClose}
      title="Cambiar estado"
      subtitle="Actualiza el avance del despacho seleccionado."
      size="sm"
      closeDisabled={loading}
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !selectedStatus}>
            {loading ? <Spinner size="sm" label="Guardando estado" className="text-current" /> : null}
            {loading ? "Guardando..." : "Guardar estado"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado actual</p>
          <p className="mt-1 text-base font-semibold text-slate-950">{getShipmentStatusLabel(shipment.status)}</p>
          <p className="mt-1 text-sm text-slate-600">{shipment.shipmentNumber}</p>
        </div>

        {!hasNextStatuses ? <FormMessage tone="info">Este envio no tiene cambios disponibles.</FormMessage> : null}

        <label className="block text-sm font-semibold text-slate-800">
          Nuevo estado
          <div className="relative">
            <GitBranch className="pointer-events-none absolute left-3 top-[2.6rem] h-4 w-4 text-slate-400" aria-hidden="true" />
            <select
              className={`${selectClassName} pl-10`}
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as ShipmentStatus)}
              disabled={loading || !hasNextStatuses}
            >
              {nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {getShipmentStatusLabel(status)}
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
    </Modal>
  );
}
