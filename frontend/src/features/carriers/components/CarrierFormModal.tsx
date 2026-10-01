type CarrierFormModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CarrierFormModal({ open, onClose }: CarrierFormModalProps) {
  void onClose;

  if (!open) {
    return null;
  }

  return null;
}
