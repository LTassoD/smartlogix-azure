import { useMemo, useState } from "react";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { InventoryItem, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import { SearchableCombobox, type SearchableComboboxOption } from "@/components/ui/SearchableCombobox";
import type { OrderFormDraftItem } from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrderItemsEditorProps = {
  items: OrderFormDraftItem[];
  inventoryItems: InventoryItem[];
  warehouses: WarehouseResponse[];
  disabled: boolean;
  error?: string;
  onChange: (items: OrderFormDraftItem[]) => void;
};

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

const inputClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function OrderItemsEditor({ disabled, error, inventoryItems, items, warehouses, onChange }: OrderItemsEditorProps) {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [localError, setLocalError] = useState<string | null>(null);
  const activeItems = useMemo(() => inventoryItems.filter((item) => item.active && item.warehouseStocks.length > 0), [inventoryItems]);
  const selectedProduct = activeItems.find((item) => String(item.productId) === productId) ?? null;
  const activeWarehouseIds = new Set(warehouses.filter((warehouse) => warehouse.active).map((warehouse) => warehouse.id));
  const availableStocks =
    selectedProduct?.warehouseStocks.filter((stock) => activeWarehouseIds.has(stock.warehouseId) && stock.quantity > 0) ?? [];
  const selectedStock = availableStocks.find((stock) => String(stock.warehouseId) === warehouseId) ?? null;
  const productOptions = activeItems.map(inventoryItemToOption);
  const warehouseOptions = availableStocks.map(stockToOption);
  const formError = error ?? localError;

  function handleProductChange(nextProductId: string) {
    const nextProduct = activeItems.find((item) => String(item.productId) === nextProductId) ?? null;
    const firstAvailableStock = nextProduct?.warehouseStocks.find((stock) => activeWarehouseIds.has(stock.warehouseId) && stock.quantity > 0);

    setProductId(nextProductId);
    setWarehouseId(firstAvailableStock ? String(firstAvailableStock.warehouseId) : "");
    setLocalError(null);
  }

  function handleAddItem() {
    setLocalError(null);

    if (!selectedProduct || !selectedStock) {
      setLocalError("Selecciona un producto con bodega disponible.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setLocalError("Ingresa una cantidad valida.");
      return;
    }

    const existingItem = items.find((item) => item.productId === selectedProduct.productId && item.warehouseId === selectedStock.warehouseId);
    const nextQuantity = (existingItem?.quantity ?? 0) + parsedQuantity;

    if (nextQuantity > selectedStock.quantity) {
      setLocalError("No hay stock suficiente para la cantidad solicitada.");
      return;
    }

    if (existingItem) {
      onChange(items.map((item) => (item.draftId === existingItem.draftId ? { ...item, quantity: nextQuantity } : item)));
    } else {
      onChange([
        ...items,
        {
          draftId: `${selectedProduct.productId}-${selectedStock.warehouseId}`,
          productId: selectedProduct.productId,
          warehouseId: selectedStock.warehouseId,
          sku: selectedProduct.sku,
          productName: selectedProduct.name,
          unitPrice: selectedProduct.unitPrice,
          quantity: parsedQuantity,
          availableStock: selectedStock.quantity,
          warehouseName: selectedStock.warehouseName,
          warehouseCode: selectedStock.warehouseCode
        }
      ]);
    }

    setQuantity("1");
  }

  function handleQuantityChange(draftId: string, nextValue: string) {
    const parsedQuantity = Number(nextValue);
    const item = items.find((candidate) => candidate.draftId === draftId);

    if (!item || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > item.availableStock) {
      return;
    }

    onChange(items.map((candidate) => (candidate.draftId === draftId ? { ...candidate, quantity: parsedQuantity } : candidate)));
  }

  return (
    <div className="space-y-4">
      {formError ? <FormMessage tone="error">{formError}</FormMessage> : null}
      {activeItems.length === 0 ? <FormMessage>No hay productos activos con disponibilidad registrada.</FormMessage> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_120px_auto]">
        <SearchableCombobox
          label="Producto"
          value={productId}
          options={productOptions}
          placeholder="Selecciona un producto"
          searchPlaceholder="Buscar por nombre o SKU"
          emptyMessage="No se encontraron productos."
          disabled={disabled || activeItems.length === 0}
          onChange={handleProductChange}
        />

        <SearchableCombobox
          label="Bodega"
          value={warehouseId}
          options={warehouseOptions}
          placeholder="Selecciona una bodega"
          searchPlaceholder="Buscar bodega"
          emptyMessage="Sin disponibilidad para este producto."
          disabled={disabled || !selectedProduct}
          onChange={setWarehouseId}
        />

        <label className="block text-sm font-semibold text-slate-800">
          Cantidad
          <input
            type="number"
            min="1"
            max={selectedStock?.quantity}
            step="1"
            className={inputClassName}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={disabled || !selectedStock}
          />
        </label>

        <div className="flex items-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" className="min-h-12 w-full lg:w-auto" onClick={handleAddItem} disabled={disabled || !selectedStock}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Agregar producto al pedido</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <PackagePlus className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-950">Productos agregados</p>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.draftId} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(180px,1fr)_150px_110px_130px_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950" title={item.productName}>
                    {item.productName}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {item.sku} - {item.warehouseName}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-slate-700">{currencyFormatter.format(item.unitPrice)}</p>
                <label className="sr-only" htmlFor={`quantity-${item.draftId}`}>
                  Cantidad
                </label>
                <input
                  id={`quantity-${item.draftId}`}
                  type="number"
                  min="1"
                  max={item.availableStock}
                  step="1"
                  value={item.quantity}
                  onChange={(event) => handleQuantityChange(item.draftId, event.target.value)}
                  disabled={disabled}
                  className={cn(inputClassName, "mt-0 min-h-10")}
                />
                <p className="text-sm font-semibold tabular-nums text-slate-950">{currencyFormatter.format(item.unitPrice * item.quantity)}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-10 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onChange(items.filter((candidate) => candidate.draftId !== item.draftId))}
                      disabled={disabled}
                      aria-label="Quitar producto"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quitar producto</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
          Selecciona productos para registrar el pedido.
        </div>
      )}
    </div>
  );
}

function inventoryItemToOption(item: InventoryItem): SearchableComboboxOption {
  return {
    value: String(item.productId),
    label: item.name,
    description: item.sku,
    badge: item.totalQuantity.toLocaleString("es-CL")
  };
}

function stockToOption(stock: InventoryItem["warehouseStocks"][number]): SearchableComboboxOption {
  return {
    value: String(stock.warehouseId),
    label: stock.warehouseName,
    description: stock.warehouseCode,
    badge: stock.quantity.toLocaleString("es-CL")
  };
}
