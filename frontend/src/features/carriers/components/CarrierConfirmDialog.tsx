import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Carrier } from "@/features/carriers/types/carrierTypes";

type CarrierConfirmDialogProps = {
  carrier: Carrier | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function CarrierConfirmDialog({ carrier, loading, onClose, onConfirm }: CarrierConfirmDialogProps) {
  if (!carrier) {
    return null;
  }

  const nextAvailable = !carrier.simulatedAvailable;

  return (
    <ConfirmDialog
      open={Boolean(carrier)}
      title={nextAvailable ? "Marcar disponible" : "Marcar no disponible"}
      description={
        nextAvailable
          ? "El transportista volvera a estar disponible para nuevas asignaciones."
          : "El transportista no se ofrecera para nuevas asignaciones mientras no este disponible."
      }
      confirmLabel={nextAvailable ? "Marcar disponible" : "Marcar no disponible"}
      loading={loading}
      tone={nextAvailable ? "primary" : "danger"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {nextAvailable
        ? `${carrier.name} quedara disponible para despachos.`
        : `${carrier.name} quedara fuera de las asignaciones disponibles.`}
    </ConfirmDialog>
  );
}
