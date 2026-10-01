import { useEffect, useMemo, useState } from "react";
import { MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { SearchableCombobox, type SearchableComboboxOption } from "@/components/ui/SearchableCombobox";
import { Spinner } from "@/components/ui/spinner";
import type { Carrier } from "@/features/carriers/types/carrierTypes";
import type { DispatchOrderInput } from "@/features/orders/hooks/useOrders";
import type { Order } from "@/features/orders/types/orderTypes";

type OrderAssignCarrierModalProps = {
  order: Order | null;
  carriers: Carrier[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (input: DispatchOrderInput) => void;
};

export function OrderAssignCarrierModal({ carriers, loading, onClose, onConfirm, order }: OrderAssignCarrierModalProps) {
  const [carrierCode, setCarrierCode] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const availableCarriers = useMemo(() => carriers.filter((carrier) => carrier.active && carrier.simulatedAvailable), [carriers]);
  const carrierOptions = useMemo(() => availableCarriers.map(carrierToOption), [availableCarriers]);
  const currentCarrierCode = order?.shipment?.carrier?.code ?? "";

  useEffect(() => {
    if (order) {
      setCarrierCode(availableCarriers.some((carrier) => carrier.code === currentCarrierCode) ? currentCarrierCode : "");
      setDestinationCity(order.shipment?.destinationCity ?? "");
      setComment("");
      setError(null);
    }
  }, [availableCarriers, currentCarrierCode, order]);

  if (!order) {
    return null;
  }

  const hasAvailableCarriers = availableCarriers.length > 0;

  function handleSubmit() {
    if (!hasAvailableCarriers) {
      setError("No hay transportistas disponibles para asignar.");
      return;
    }

    if (!carrierCode) {
      setError("Selecciona un transportista para continuar.");
      return;
    }

    setError(null);
    onConfirm({
      carrierCode,
      destinationCity: destinationCity.trim() || undefined,
      comment: comment.trim() || undefined
    });
  }

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title="Asignar transportista"
      subtitle="Selecciona el proveedor logistico antes de marcar el pedido en despacho."
      size="md"
      closeDisabled={loading}
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !hasAvailableCarriers || !carrierCode}>
            {loading ? <Spinner size="sm" label="Procesando despacho" className="text-current" /> : <Truck className="h-4 w-4" aria-hidden="true" />}
            {loading ? "Procesando..." : "Marcar en despacho"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedido</p>
          <p className="mt-1 text-base font-semibold text-slate-950">{order.orderNumber}</p>
          <p className="mt-1 text-sm text-slate-600">{order.customer.fullName}</p>
        </div>

        {!hasAvailableCarriers ? (
          <FormMessage tone="error">No hay transportistas disponibles para asignar.</FormMessage>
        ) : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <SearchableCombobox
          label="Transportista"
          value={carrierCode}
          options={carrierOptions}
          placeholder="Selecciona un transportista"
          searchPlaceholder="Buscar transportista"
          emptyMessage="No se encontraron transportistas disponibles."
          disabled={loading || !hasAvailableCarriers}
          error={!carrierCode && error ? "Selecciona un transportista." : undefined}
          required
          onChange={(value) => {
            setCarrierCode(value);
            setError(null);
          }}
        />

        <label className="block text-sm font-semibold text-slate-800">
          Ciudad destino
          <div className="relative mt-2">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              value={destinationCity}
              onChange={(event) => setDestinationCity(event.target.value)}
              placeholder="Ciudad de entrega"
              disabled={loading}
            />
          </div>
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Observacion
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

function carrierToOption(carrier: Carrier): SearchableComboboxOption {
  return {
    value: carrier.code,
    label: carrier.name,
    description: formatServiceType(carrier.serviceType),
    badge: carrier.code
  };
}

function formatServiceType(value: string | null): string {
  if (!value) {
    return "No informado";
  }

  return value
    .toLocaleLowerCase("es-CL")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1))
    .join(" ");
}
