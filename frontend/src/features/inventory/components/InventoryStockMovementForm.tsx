import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Calculator, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/TextInput";
import { InventoryStatusBadge } from "@/features/inventory/components/InventoryStatusBadge";
import type {
  CreateStockMovementRequest,
  InventoryItem,
  StockMovementType,
  WarehouseResponse
} from "@/features/inventory/types/inventoryTypes";
import { cn } from "@/utils/cn";

type StockMovementUiType = Extract<StockMovementType, "IN" | "OUT" | "ADJUSTMENT">;

type StockMovementFormValues = {
  warehouseId: string;
  type: StockMovementUiType;
  quantity: string;
  reason: string;
};

type StockMovementFormErrors = Partial<Record<keyof StockMovementFormValues | "form", string>>;

type InventoryStockMovementFormProps = {
  item: InventoryItem | null;
  warehouses: WarehouseResponse[];
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateStockMovementRequest) => Promise<void>;
};

const movementTypes: Array<{ value: StockMovementUiType; label: string; description: string }> = [
  { value: "IN", label: "Entrada", description: "Suma unidades al stock." },
  { value: "OUT", label: "Salida", description: "Resta unidades disponibles." },
  { value: "ADJUSTMENT", label: "Ajuste", description: "Define el stock final." }
];

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function InventoryStockMovementForm({ item, warehouses, open, saving, onClose, onSubmit }: InventoryStockMovementFormProps) {
  const formId = useId();
  const [renderItem, setRenderItem] = useState<InventoryItem | null>(item);
  const activeItem = item ?? renderItem;
  const defaultWarehouseId = useMemo(() => {
    if (item?.warehouseStocks[0]) {
      return String(item.warehouseStocks[0].warehouseId);
    }

    if (warehouses[0]) {
      return String(warehouses[0].id);
    }

    return "";
  }, [item, warehouses]);
  const [values, setValues] = useState<StockMovementFormValues>({
    warehouseId: defaultWarehouseId,
    type: "IN",
    quantity: "",
    reason: ""
  });
  const [errors, setErrors] = useState<StockMovementFormErrors>({});

  useEffect(() => {
    if (item) {
      setRenderItem(item);
      setValues({ warehouseId: defaultWarehouseId, type: "IN", quantity: "", reason: "" });
      setErrors({});
    }
  }, [defaultWarehouseId, item]);

  const effectiveWarehouseId = values.warehouseId || defaultWarehouseId;
  const selectedStock = activeItem?.warehouseStocks.find((stock) => String(stock.warehouseId) === effectiveWarehouseId);
  const selectedWarehouse = warehouses.find((warehouse) => String(warehouse.id) === effectiveWarehouseId);
  const currentStock = selectedStock?.quantity ?? 0;
  const minimumStock = selectedStock?.minimumStock ?? 0;
  const quantity = Number(values.quantity);
  const hasValidQuantity = values.quantity.trim() !== "" && Number.isInteger(quantity) && quantity > 0;
  const resultingStock = hasValidQuantity ? calculateResultingStock(currentStock, quantity, values.type) : currentStock;

  function handleClose() {
    if (saving) {
      return;
    }

    setValues({ warehouseId: defaultWarehouseId, type: "IN", quantity: "", reason: "" });
    setErrors({});
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeItem) {
      return;
    }

    const effectiveValues = { ...values, warehouseId: effectiveWarehouseId };
    const nextErrors = validate(effectiveValues, currentStock);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onSubmit({
        productId: activeItem.productId,
        warehouseId: Number(effectiveValues.warehouseId),
        type: effectiveValues.type,
        quantity: Number(effectiveValues.quantity),
        reason: effectiveValues.reason.trim() || undefined
      });
      setValues({ warehouseId: defaultWarehouseId, type: "IN", quantity: "", reason: "" });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "No se pudo registrar el movimiento." });
    }
  }

  if (!activeItem) {
    return null;
  }

  return (
    <Modal
      open={open && Boolean(item)}
      onClose={handleClose}
      title="Ajustar stock"
      subtitle="Revisa el resultado antes de registrar el movimiento."
      size="lg"
      closeDisabled={saving}
      closeOnOverlayClick={false}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving || warehouses.length === 0}>
            {saving ? <Spinner size="sm" label="Registrando movimiento" className="text-current" /> : null}
            {saving ? "Registrando..." : "Registrar movimiento"}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {errors.form ? <FormMessage tone="error">{errors.form}</FormMessage> : null}

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</p>
              <h4 className="mt-1 text-base font-semibold text-slate-950">{activeItem.name}</h4>
              <p className="mt-1 text-sm text-slate-500">SKU {activeItem.sku}</p>
            </div>
            <InventoryStatusBadge status={activeItem.stockStatus} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StockContextMetric label="Stock actual" value={currentStock.toLocaleString("es-CL")} />
            <StockContextMetric label="Stock minimo" value={minimumStock.toLocaleString("es-CL")} />
            <StockContextMetric label="Bodega" value={selectedWarehouse ? selectedWarehouse.name : "No informado"} />
          </div>
        </section>

        {warehouses.length === 0 ? (
          <FormMessage tone="info">No hay bodegas disponibles para registrar movimientos.</FormMessage>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800">
            Bodega
            <select
              className={cn(selectClassName, errors.warehouseId && "border-danger focus:border-danger focus:ring-red-600/15")}
              value={effectiveWarehouseId}
              onChange={(event) => setValues((current) => ({ ...current, warehouseId: event.target.value }))}
              disabled={saving || warehouses.length === 0}
              aria-invalid={Boolean(errors.warehouseId)}
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
            {errors.warehouseId ? (
              <span className="mt-2 block text-sm font-medium leading-5 text-danger">{errors.warehouseId}</span>
            ) : (
              <span className="mt-2 block text-sm leading-5 text-slate-500">Selecciona donde se aplicara el movimiento.</span>
            )}
          </label>

          <label className="block text-sm font-semibold text-slate-800">
            Tipo de movimiento
            <select
              className={selectClassName}
              value={values.type}
              onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as StockMovementUiType }))}
              disabled={saving}
            >
              {movementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-sm leading-5 text-slate-500">
              {movementTypes.find((type) => type.value === values.type)?.description}
            </span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Cantidad"
            name="quantity"
            type="number"
            min="1"
            step="1"
            value={values.quantity}
            error={errors.quantity}
            helperText="Debe ser mayor a 0."
            onChange={(event) => setValues((current) => ({ ...current, quantity: event.target.value }))}
            disabled={saving}
            required
          />

          <label className="block text-sm font-semibold text-slate-800">
            Motivo
            <textarea
              className="mt-2 block min-h-24 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              value={values.reason}
              onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))}
              disabled={saving}
              placeholder="Ej. recepcion de mercaderia, merma, conteo fisico."
            />
            <span className="mt-2 block text-sm leading-5 text-slate-500">Opcional. Quedara asociado al movimiento.</span>
          </label>
        </div>

        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Calculo de stock
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ResultMetric icon={<ArrowDownToLine className="h-4 w-4" aria-hidden="true" />} label="Actual" value={currentStock} />
            <ResultMetric icon={<ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />} label="Cantidad" value={hasValidQuantity ? quantity : 0} />
            <ResultMetric icon={<RotateCw className="h-4 w-4" aria-hidden="true" />} label="Resultante" value={resultingStock} highlighted />
          </div>
          {hasValidQuantity && values.type === "OUT" && resultingStock < minimumStock ? (
            <p className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800">
              El stock quedara bajo el minimo registrado para esta bodega.
            </p>
          ) : null}
        </section>
      </form>
    </Modal>
  );
}

function StockContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ResultMetric({
  label,
  value,
  icon,
  highlighted = false
}: {
  label: string;
  value: number;
  icon: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-3", highlighted ? "border-blue-200 shadow-sm" : "border-blue-100")}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        <span className="text-blue-700">{icon}</span>
      </div>
      <p className={cn("mt-2 text-xl font-semibold", highlighted ? "text-blue-900" : "text-slate-950")}>{value.toLocaleString("es-CL")}</p>
    </div>
  );
}

function validate(values: StockMovementFormValues, currentStock: number): StockMovementFormErrors {
  const errors: StockMovementFormErrors = {};
  const quantity = Number(values.quantity);

  if (!values.warehouseId) {
    errors.warehouseId = "Selecciona una bodega.";
  }

  if (!values.quantity.trim() || !Number.isInteger(quantity) || quantity <= 0) {
    errors.quantity = "Ingresa una cantidad valida.";
  }

  if (values.type === "OUT" && Number.isInteger(quantity) && quantity > currentStock) {
    errors.quantity = "La salida no puede superar el stock disponible.";
  }

  return errors;
}

function calculateResultingStock(currentStock: number, quantity: number, type: StockMovementUiType): number {
  if (type === "IN") {
    return currentStock + quantity;
  }

  if (type === "OUT") {
    return currentStock - quantity;
  }

  return quantity;
}
