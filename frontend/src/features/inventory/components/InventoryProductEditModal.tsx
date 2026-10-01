import { useEffect, useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Building2, PackageOpen, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/TextInput";
import type {
  InventoryItem,
  UpdateProductWithMinimumStockRequest,
  WarehouseResponse
} from "@/features/inventory/types/inventoryTypes";
import { generateSkuFromName, getExistingSkus } from "@/features/inventory/utils/skuUtils";
import { cn } from "@/utils/cn";

type ProductEditValues = {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  active: string;
  warehouseId: string;
  minimumStock: string;
};

type ProductEditErrors = Partial<Record<keyof ProductEditValues | "form", string>>;

type InventoryProductEditModalProps = {
  item: InventoryItem | null;
  open: boolean;
  saving: boolean;
  warehouses: WarehouseResponse[];
  existingItems: InventoryItem[];
  onClose: () => void;
  onSubmit: (productId: number, input: UpdateProductWithMinimumStockRequest) => Promise<void>;
};

const inputClassName =
  "block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function InventoryProductEditModal({
  item,
  open,
  saving,
  warehouses,
  existingItems,
  onClose,
  onSubmit
}: InventoryProductEditModalProps) {
  const formId = useId();
  const skuInputId = useId();
  const skuMessageId = useId();
  const [values, setValues] = useState<ProductEditValues>(getInitialValues(item, warehouses));
  const [errors, setErrors] = useState<ProductEditErrors>({});
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.active);
  const existingSkus = getExistingSkus(existingItems, item?.productId);

  useEffect(() => {
    if (item) {
      setValues(getInitialValues(item, warehouses));
      setErrors({});
    }
  }, [item, warehouses]);

  const selectedStock = item?.warehouseStocks.find((stock) => String(stock.warehouseId) === values.warehouseId);

  function handleClose() {
    if (saving) {
      return;
    }

    setErrors({});
    onClose();
  }

  function handleGenerateSku() {
    setValues((current) => ({ ...current, sku: generateSkuFromName(current.name, existingSkus) }));
  }

  function handleWarehouseChange(event: ChangeEvent<HTMLSelectElement>) {
    const warehouseId = event.target.value;
    const stock = item?.warehouseStocks.find((warehouseStock) => String(warehouseStock.warehouseId) === warehouseId);

    setValues((current) => ({
      ...current,
      warehouseId,
      minimumStock: String(stock?.minimumStock ?? 0)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!item) {
      return;
    }

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onSubmit(item.productId, {
        product: {
          sku: values.sku.trim(),
          name: values.name.trim(),
          description: values.description.trim(),
          unitPrice: Number(values.unitPrice),
          active: values.active === "true"
        },
        stockMinimum: values.warehouseId
          ? {
              warehouseId: Number(values.warehouseId),
              minimumStock: Number(values.minimumStock || "0")
            }
          : undefined
      });
      setErrors({});
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el producto.";
      setErrors({
        form: message,
        sku: message.includes("SKU") ? message : undefined
      });
    }
  }

  if (!item) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Editar producto"
      subtitle="Actualiza datos generales y stock minimo por bodega."
      size="xl"
      closeDisabled={saving}
      closeOnOverlayClick={false}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? <Spinner size="sm" label="Guardando producto" className="text-current" /> : null}
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {errors.form ? <FormMessage tone="error">{errors.form}</FormMessage> : null}

        <FormSection
          icon={<PackageOpen className="h-4 w-4" aria-hidden="true" />}
          title="Informacion del producto"
          description="SKU, nombre, descripcion y estado operativo."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Nombre"
              name="edit-name"
              value={values.name}
              error={errors.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
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
                  name="edit-sku"
                  value={values.sku}
                  onChange={(event) => setValues((current) => ({ ...current, sku: event.target.value.toLocaleUpperCase("es-CL") }))}
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
                {errors.sku ?? "Puedes conservarlo o generar uno desde el nombre."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="block text-sm font-semibold text-slate-800">
              Descripcion
              <textarea
                className="mt-2 block min-h-28 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                value={values.description}
                onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                disabled={saving}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              Estado
              <select
                className={selectClassName}
                value={values.active}
                onChange={(event) => setValues((current) => ({ ...current, active: event.target.value }))}
                disabled={saving}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              <span className="mt-2 block text-sm leading-5 text-slate-500">Controla si aparece como producto activo.</span>
            </label>
          </div>
        </FormSection>

        <FormSection
          icon={<WalletCards className="h-4 w-4" aria-hidden="true" />}
          title="Valores"
          description="El stock actual se sigue modificando desde Ajustar stock."
        >
          <TextInput
            label="Precio unitario"
            name="edit-unitPrice"
            type="number"
            min="0"
            step="1"
            value={values.unitPrice}
            error={errors.unitPrice}
            onChange={(event) => setValues((current) => ({ ...current, unitPrice: event.target.value }))}
            disabled={saving}
            required
          />
        </FormSection>

        <FormSection
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          title="Stock minimo por bodega"
          description="Selecciona la bodega donde se aplicara el umbral."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-800">
              Bodega
              <select
                className={cn(selectClassName, errors.warehouseId && "border-danger focus:border-danger focus:ring-red-600/15")}
                value={values.warehouseId}
                onChange={handleWarehouseChange}
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
              <span className={cn("mt-2 block text-sm leading-5 text-slate-500", errors.warehouseId && "font-medium text-danger")}>
                {errors.warehouseId ?? "Si no existe registro, se creara con stock actual 0."}
              </span>
            </label>

            <TextInput
              label="Stock minimo"
              name="edit-minimumStock"
              type="number"
              min="0"
              step="1"
              value={values.minimumStock}
              error={errors.minimumStock}
              helperText={selectedStock ? `Stock actual en bodega: ${selectedStock.quantity.toLocaleString("es-CL")}` : "Umbral para alerta de stock bajo."}
              onChange={(event) => setValues((current) => ({ ...current, minimumStock: event.target.value }))}
              disabled={saving || !values.warehouseId}
            />
          </div>
        </FormSection>
      </form>
    </Modal>
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

function getInitialValues(item: InventoryItem | null, warehouses: WarehouseResponse[]): ProductEditValues {
  const warehouseId = item?.warehouseStocks[0]?.warehouseId ?? warehouses.find((warehouse) => warehouse.active)?.id ?? "";
  const stock = item?.warehouseStocks.find((warehouseStock) => warehouseStock.warehouseId === Number(warehouseId));

  return {
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    unitPrice: item ? String(item.unitPrice) : "",
    active: item?.active === false ? "false" : "true",
    warehouseId: warehouseId ? String(warehouseId) : "",
    minimumStock: String(stock?.minimumStock ?? 0)
  };
}

function validate(values: ProductEditValues): ProductEditErrors {
  const errors: ProductEditErrors = {};
  const price = Number(values.unitPrice);
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

  if (values.minimumStock.trim() && (!Number.isInteger(minimumStock) || minimumStock < 0)) {
    errors.minimumStock = "Ingresa un minimo valido.";
  }

  return errors;
}
