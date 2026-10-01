import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import type { Warehouse, WarehouseFormValues } from "@/features/warehouses/types/warehouseTypes";

type WarehouseFormModalProps = {
  open: boolean;
  saving: boolean;
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (values: WarehouseFormValues) => Promise<void>;
};

type FormErrors = Partial<Record<keyof WarehouseFormValues, string>>;

const initialValues: WarehouseFormValues = {
  code: "",
  name: "",
  address: ""
};

const inputClassName =
  "mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function WarehouseFormModal({ onClose, onSubmit, open, saving, warehouses }: WarehouseFormModalProps) {
  const [values, setValues] = useState<WarehouseFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  const existingCodes = useMemo(() => new Set(warehouses.map((warehouse) => warehouse.code.trim().toLocaleLowerCase("es-CL"))), [warehouses]);

  async function handleSubmit() {
    const nextErrors = validateForm(values, existingCodes);
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      setFormError("Revisa los campos marcados para continuar.");
      return;
    }

    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No fue posible completar la operacion.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar bodega"
      subtitle="Crea una ubicacion operativa para gestionar stock."
      closeDisabled={saving}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Spinner size="sm" label="Guardando bodega" className="text-current" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Guardando..." : "Registrar bodega"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {formError ? <FormMessage tone="error">{formError}</FormMessage> : null}

        <section>
          <h4 className="text-sm font-semibold text-slate-950">Informacion general</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Codigo" error={errors.code}>
              <input
                className={inputClassName}
                value={values.code}
                disabled={saving}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
                placeholder="WH-001"
              />
            </Field>
            <Field label="Nombre" error={errors.name}>
              <input
                className={inputClassName}
                value={values.name}
                disabled={saving}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                placeholder="Bodega central"
              />
            </Field>
          </div>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-slate-950">Ubicacion</h4>
          <div className="mt-3">
            <Field label="Direccion" error={errors.address}>
              <input
                className={inputClassName}
                value={values.address}
                disabled={saving}
                onChange={(event) => setValues((current) => ({ ...current, address: event.target.value }))}
                placeholder="Direccion registrada"
              />
            </Field>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Field({
  children,
  error,
  label
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function validateForm(values: WarehouseFormValues, existingCodes: Set<string>): FormErrors {
  const errors: FormErrors = {};
  const code = values.code.trim();
  const name = values.name.trim();

  if (!code) {
    errors.code = "Ingresa un codigo.";
  } else if (existingCodes.has(code.toLocaleLowerCase("es-CL"))) {
    errors.code = "Ya existe una bodega con este codigo.";
  }

  if (!name) {
    errors.name = "Ingresa un nombre.";
  }

  return errors;
}
