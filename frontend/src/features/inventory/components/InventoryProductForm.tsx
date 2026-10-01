import { useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Building2, PackagePlus, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/TextInput";
import type {
  CreateProductWithInitialStockRequest,
  InventoryItem,
  WarehouseResponse
} from "@/features/inventory/types/inventoryTypes";
import { generateSkuFromName, getExistingSkus } from "@/features/inventory/utils/skuUtils";
import { cn } from "@/utils/cn";

type ProductFormValues = {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  initialStock: string;
  minimumStock: string;
  warehouseId: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormValues | "form", string>>;

type InventoryProductFormProps = {
  open: boolean;
  saving: boolean;
  warehouses: WarehouseResponse[];
  existingItems: InventoryItem[];
  onClose: () => void;
  onSubmit: (input: CreateProductWithInitialStockRequest) => Promise<void>;
};

const initialValues: ProductFormValues = {
  sku: "",
  name: "",
  description: "",
  unitPrice: "",
  initialStock: "",
  minimumStock: "0",
  warehouseId: ""
};

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

const inputClassName =
  "block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function InventoryProductForm({ open, saving, warehouses, existingItems, onClose, onSubmit }: InventoryProductFormProps) {
  const formId = useId();
  const skuInputId = useId();
  const skuMessageId = useId();
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [skuEditedManually, setSkuEditedManually] = useState(false);
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.active);
  const existingSkus = getExistingSkus(existingItems);

  function handleClose() {
    if (saving) {
      return;
    }

    resetForm();
    onClose();
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value;

    setValues((current) => ({
      ...current,
      name: nextName,
      sku: skuEditedManually ? current.sku : generateSkuFromName(nextName, existingSkus)
    }));
  }

  function handleSkuChange(event: ChangeEvent<HTMLInputElement>) {
    setSkuEditedManually(true);
    setValues((current) => ({ ...current, sku: event.target.value.toLocaleUpperCase("es-CL") }));
  }

  function handleGenerateSku() {
    setSkuEditedManually(false);
    setValues((current) => ({ ...current, sku: generateSkuFromName(current.name, existingSkus) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values, activeWarehouses.length > 0);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const initialStockQuantity = Number(values.initialStock || "0");
    const minimumStock = Number(values.minimumStock || "0");
    const shouldConfigureStock = Boolean(values.warehouseId) && (initialStockQuantity > 0 || minimumStock > 0);

    try {
      await onSubmit({
        product: {
          sku: values.sku.trim(),
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          unitPrice: Number(values.unitPrice)
        },
        stockSetup: shouldConfigureStock
          ? {
              warehouseId: Number(values.warehouseId),
              quantity: initialStockQuantity,
              minimumStock
            }
          : undefined
      });
      resetForm();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el producto.";
      setErrors({
        form: message,
        sku: message.includes("SKU") ? message : undefined
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar producto"
      subtitle="Completa la informacion principal y configura stock inicial si corresponde."
      size="xl"
      closeDisabled={saving}
      closeOnOverlayClick={false}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? <Spinner size="sm" label="Registrando producto" className="text-current" /> : null}
            {saving ? "Registrando..." : "Registrar producto"}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {errors.form ? <FormMessage tone="error">{errors.form}</FormMessage> : null}

        <FormSection
          icon={<PackagePlus className="h-4 w-4" aria-hidden="true" />}
          title="Informacion del producto"
          description="Datos visibles para busqueda, detalle y control operativo."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Nombre"
              name="name"
              value={values.name}
              error={errors.name}
              helperText="El SKU se sugerira automaticamente mientras escribes."
              onChange={handleNameChange}
              disabled={saving}
              required
            />

            <div>
              <label htmlFor={skuInputId} className="block text-sm font-semibold text-slate-800">
                SKU<span className="ml-1 text-brand-600">*</span>
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id={skuInputId}
                  name="sku"
                  value={values.sku}
                  onChange={handleSkuChange}
                  disabled={saving}
                  required
                  aria-invalid={Boolean(errors.sku)}
                  aria-describedby={skuMessageId}
                  className={cn(inputClassName, errors.sku && "border-danger focus:border-danger focus:ring-red-600/15")}
                />
                <Button type="button" variant="secondary" className="min-h-12 shrink-0 px-3" onClick={handleGenerateSku} disabled={saving || !values.name.trim()}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generar
                </Button>
              </div>
              <p id={skuMessageId} className={cn("mt-2 text-sm leading-5 text-slate-500", errors.sku && "font-medium text-danger")}>
                {errors.sku ?? "Puedes editarlo manualmente si necesitas otro codigo."}
              </p>
            </div>
          </div>

          <label className="block text-sm font-semibold text-slate-800">
            Descripcion
            <textarea
              className="mt-2 block min-h-28 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              disabled={saving}
              placeholder="Caracteristicas, presentacion o notas comerciales."
            />
            <span className="mt-2 block text-sm leading-5 text-slate-500">Opcional. Ayuda a reconocer el producto en el detalle.</span>
          </label>
        </FormSection>

        <FormSection
          icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
          title="Valores y stock"
          description="Precio unitario, unidades iniciales y umbral minimo."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <TextInput
              label="Precio unitario"
              name="unitPrice"
              type="number"
              min="0"
              step="1"
              value={values.unitPrice}
              error={errors.unitPrice}
              helperText={getPriceHelperText(values.unitPrice)}
              onChange={(event) => setValues((current) => ({ ...current, unitPrice: event.target.value }))}
              disabled={saving}
              required
            />

            <TextInput
              label="Stock inicial"
              name="initialStock"
              type="number"
              min="0"
              step="1"
              value={values.initialStock}
              error={errors.initialStock}
              helperText="Dejalo en blanco o en 0 si aun no hay unidades."
              onChange={(event) => setValues((current) => ({ ...current, initialStock: event.target.value }))}
              disabled={saving}
            />

            <TextInput
              label="Stock minimo"
              name="minimumStock"
              type="number"
              min="0"
              step="1"
              value={values.minimumStock}
              error={errors.minimumStock}
              helperText="Umbral usado para alertas de stock bajo."
              onChange={(event) => setValues((current) => ({ ...current, minimumStock: event.target.value }))}
              disabled={saving}
            />
          </div>
        </FormSection>

        <FormSection
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          title="Bodega inicial"
          description="Necesaria cuando registras stock inicial o stock minimo."
        >
          <label className="block text-sm font-semibold text-slate-800">
            Bodega
            <select
              className={cn(selectClassName, errors.warehouseId && "border-danger focus:border-danger focus:ring-red-600/15")}
              value={values.warehouseId}
              onChange={(event) => setValues((current) => ({ ...current, warehouseId: event.target.value }))}
              disabled={saving || activeWarehouses.length === 0}
              aria-invalid={Boolean(errors.warehouseId)}
            >
              <option value="">Selecciona una bodega</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
            {errors.warehouseId ? (
              <span className="mt-2 block text-sm font-medium leading-5 text-danger">{errors.warehouseId}</span>
            ) : (
              <span className="mt-2 block text-sm leading-5 text-slate-500">
                Si no registras stock inicial ni minimo, puedes dejar este campo sin seleccionar.
              </span>
            )}
          </label>
        </FormSection>
      </form>
    </Modal>
  );

  function resetForm() {
    setValues(initialValues);
    setErrors({});
    setSkuEditedManually(false);
  }
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

function validate(values: ProductFormValues, hasWarehouses: boolean): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const price = Number(values.unitPrice);
  const initialStock = Number(values.initialStock || "0");
  const minimumStock = Number(values.minimumStock || "0");

  if (!values.sku.trim()) {
    errors.sku = "Ingresa un SKU.";
  }

  if (!values.name.trim()) {
    errors.name = "Ingresa un nombre.";
  }

  if (!values.unitPrice.trim() || !Number.isFinite(price) || price < 0) {
    errors.unitPrice = "Ingresa un precio valido.";
  }

  if (values.initialStock.trim() && (!Number.isInteger(initialStock) || initialStock < 0)) {
    errors.initialStock = "Ingresa una cantidad valida.";
  }

  if (values.minimumStock.trim() && (!Number.isInteger(minimumStock) || minimumStock < 0)) {
    errors.minimumStock = "Ingresa un minimo valido.";
  }

  if ((initialStock > 0 || minimumStock > 0) && !values.warehouseId) {
    errors.warehouseId = hasWarehouses ? "Selecciona una bodega para configurar stock." : "No hay bodegas disponibles.";
  }

  return errors;
}

function getPriceHelperText(value: string): string {
  const price = Number(value);

  if (!value.trim() || !Number.isFinite(price) || price < 0) {
    return "Se mostrara en pesos chilenos.";
  }

  return `Vista previa: ${currencyFormatter.format(price)}`;
}
