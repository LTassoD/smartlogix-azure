import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading = false,
  tone = "danger",
  onConfirm,
  onClose,
  children
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      size="sm"
      closeDisabled={loading}
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size="sm" label="Procesando" className="text-current" /> : null}
            {loading ? "Procesando..." : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" aria-hidden="true" />
        <div>{children ?? "Confirma la accion para continuar."}</div>
      </div>
    </Modal>
  );
}
