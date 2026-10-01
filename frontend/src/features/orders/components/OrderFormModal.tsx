import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { FileText, PackagePlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextInput";
import { Spinner } from "@/components/ui/spinner";
import type { InventoryItem, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import { OrderItemsEditor } from "@/features/orders/components/OrderItemsEditor";
import { SearchableCombobox, type SearchableComboboxOption } from "@/components/ui/SearchableCombobox";
import type { RegisterOrderInput } from "@/features/orders/hooks/useOrders";
import type { CreateCustomerRequest, OrderCustomer, OrderFormDraftItem } from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrderFormModalProps = {
  open: boolean;
  saving: boolean;
  customers: OrderCustomer[];
  inventoryItems: InventoryItem[];
  warehouses: WarehouseResponse[];
  onClose: () => void;
  onSubmit: (input: RegisterOrderInput) => Promise<void>;
};

type CustomerMode = "existing" | "new";

type OrderFormValues = {
  customerMode: CustomerMode;
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

type OrderFormErrors = Partial<Record<keyof OrderFormValues | "items" | "form", string>>;

const initialValues: OrderFormValues = {
  customerMode: "existing",
  customerId: "",
  fullName: "",
  email: "",
  phone: "",
  address: "",
  notes: ""
};

export function OrderFormModal({ customers, inventoryItems, open, saving, warehouses, onClose, onSubmit }: OrderFormModalProps) {
  const formId = useId();
  const activeCustomers = customers.filter((customer) => customer.active);
  const customerOptions = activeCustomers.map(customerToOption);
  const [values, setValues] = useState<OrderFormValues>(initialValues);
  const [items, setItems] = useState<OrderFormDraftItem[]>([]);
  const [errors, setErrors] = useState<OrderFormErrors>({});

  useEffect(() => {
    if (open && activeCustomers.length === 0) {
      setValues((current) => ({ ...current, customerMode: "new", customerId: "" }));
    }
  }, [activeCustomers.length, open]);

  function handleClose() {
    if (saving) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values, items, activeCustomers.length > 0);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onSubmit({
        customerId: values.customerMode === "existing" ? Number(values.customerId) : undefined,
        newCustomer: values.customerMode === "new" ? getCustomerRequest(values) : undefined,
        notes: values.notes,
        items
      });
      resetForm();
      onClose();
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "No se pudo registrar el pedido." });
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar pedido"
      subtitle="Selecciona cliente, productos y observaciones operativas."
      size="xl"
      closeDisabled={saving}
      closeOnOverlayClick={false}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? <Spinner size="sm" label="Registrando pedido" className="text-current" /> : null}
            {saving ? "Registrando..." : "Registrar pedido"}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {errors.form ? <FormMessage tone="error">{errors.form}</FormMessage> : null}

        <FormSection icon={<UserRound className="h-4 w-4" aria-hidden="true" />} title="Cliente" description="Datos de contacto asociados al pedido.">
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeButton
              active={values.customerMode === "existing"}
              disabled={saving || activeCustomers.length === 0}
              label="Cliente registrado"
              onClick={() => setValues((current) => ({ ...current, customerMode: "existing" }))}
            />
            <ModeButton
              active={values.customerMode === "new"}
              disabled={saving}
              label="Nuevo cliente"
              onClick={() => setValues((current) => ({ ...current, customerMode: "new", customerId: "" }))}
            />
          </div>

          {values.customerMode === "existing" ? (
            <SearchableCombobox
              label="Cliente"
              value={values.customerId}
              options={customerOptions}
              placeholder="Selecciona un cliente"
              searchPlaceholder="Buscar por nombre o correo"
              emptyMessage="No se encontraron clientes."
              disabled={saving || activeCustomers.length === 0}
              error={errors.customerId}
              required
              onChange={(customerId) => setValues((current) => ({ ...current, customerId }))}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Nombre"
                name="fullName"
                value={values.fullName}
                error={errors.fullName}
                onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))}
                disabled={saving}
                required
              />
              <TextInput
                label="Correo"
                name="email"
                type="email"
                value={values.email}
                error={errors.email}
                onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                disabled={saving}
                required
              />
              <TextInput
                label="Telefono"
                name="phone"
                value={values.phone}
                error={errors.phone}
                onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                disabled={saving}
              />
              <TextInput
                label="Direccion"
                name="address"
                value={values.address}
                error={errors.address}
                onChange={(event) => setValues((current) => ({ ...current, address: event.target.value }))}
                disabled={saving}
              />
            </div>
          )}
        </FormSection>

        <FormSection
          icon={<PackagePlus className="h-4 w-4" aria-hidden="true" />}
          title="Productos"
          description="Selecciona productos disponibles desde inventario."
        >
          <OrderItemsEditor
            items={items}
            inventoryItems={inventoryItems}
            warehouses={warehouses}
            disabled={saving}
            error={errors.items}
            onChange={(nextItems) => {
              setItems(nextItems);
              setErrors((current) => ({ ...current, items: undefined }));
            }}
          />
        </FormSection>

        <FormSection icon={<FileText className="h-4 w-4" aria-hidden="true" />} title="Observaciones" description="Informacion util para preparacion y seguimiento.">
          <label className="block text-sm font-semibold text-slate-800">
            Observacion
            <textarea
              className="mt-2 block min-h-28 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              value={values.notes}
              onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
              disabled={saving}
            />
          </label>
        </FormSection>
      </form>
    </Modal>
  );

  function resetForm() {
    setValues(initialValues);
    setItems([]);
    setErrors({});
  }
}

function ModeButton({
  active,
  disabled,
  label,
  onClick
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-brand-600/15",
        active ? "border-brand-600 bg-blue-50 text-brand-700" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
        disabled && "cursor-not-allowed opacity-60"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function FormSection({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function validate(values: OrderFormValues, items: OrderFormDraftItem[], hasExistingCustomers: boolean): OrderFormErrors {
  const errors: OrderFormErrors = {};

  if (values.customerMode === "existing" && (!hasExistingCustomers || !values.customerId)) {
    errors.customerId = hasExistingCustomers ? "Selecciona un cliente." : "No hay clientes registrados.";
  }

  if (values.customerMode === "new") {
    if (!values.fullName.trim()) {
      errors.fullName = "Ingresa el nombre del cliente.";
    }

    if (!isValidEmail(values.email)) {
      errors.email = "Ingresa un correo valido.";
    }
  }

  if (items.length === 0) {
    errors.items = "Selecciona al menos un producto.";
  }

  if (items.some((item) => item.quantity <= 0 || item.quantity > item.availableStock)) {
    errors.items = "Revisa las cantidades solicitadas.";
  }

  return errors;
}

function getCustomerRequest(values: OrderFormValues): CreateCustomerRequest {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || undefined,
    address: values.address.trim() || undefined
  };
}

function customerToOption(customer: OrderCustomer): SearchableComboboxOption {
  return {
    value: String(customer.id),
    label: customer.fullName,
    description: customer.email,
    badge: customer.phone ?? undefined
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
