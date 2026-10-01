import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, RefreshCw, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import {
  ORDER_STATUSES,
  getOrderStatusLabel,
  type Order,
  type OrderCustomer,
  type OrderFilters as OrderFiltersState
} from "@/features/orders/types/orderTypes";
import { cn } from "@/utils/cn";

type OrdersFiltersProps = {
  filters: OrderFiltersState;
  orders: Order[];
  customers: OrderCustomer[];
  warehouses: WarehouseResponse[];
  loading: boolean;
  searching: boolean;
  hasActiveFilters: boolean;
  onChange: (filters: Partial<OrderFiltersState>) => void;
  onReset: () => void;
  onRefresh: () => void;
};

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const dateClassName =
  "block min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function OrdersFilters({
  filters,
  orders,
  customers,
  warehouses,
  loading,
  searching,
  hasActiveFilters,
  onChange,
  onReset,
  onRefresh
}: OrdersFiltersProps) {
  const activeCustomers = customers.filter((customer) => customer.active);
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.active);
  const fieldClassName = "block min-w-0 text-sm font-semibold text-slate-800";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SearchBox orders={orders} query={filters.query} searching={searching} onChange={(query) => onChange({ query })} />

        <label className={fieldClassName}>
          Estado
          <select
            className={selectClassName}
            value={filters.status}
            onChange={(event) => onChange({ status: event.target.value as OrderFiltersState["status"] })}
          >
            <option value="all">Todos los estados</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClassName}>
          Cliente
          <select
            className={selectClassName}
            value={filters.customerId}
            onChange={(event) => onChange({ customerId: event.target.value })}
            disabled={activeCustomers.length === 0}
          >
            <option value="all">Todos los clientes</option>
            {activeCustomers.map((customer) => (
              <option key={customer.id} value={String(customer.id)}>
                {customer.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClassName}>
          Bodega
          <select
            className={selectClassName}
            value={filters.warehouseId}
            onChange={(event) => onChange({ warehouseId: event.target.value })}
            disabled={activeWarehouses.length === 0}
          >
            <option value="all">Todas las bodegas</option>
            {activeWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={String(warehouse.id)}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>

      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DateInput label="Desde" value={filters.dateFrom} onChange={(dateFrom) => onChange({ dateFrom })} />
        <DateInput label="Hasta" value={filters.dateTo} onChange={(dateTo) => onChange({ dateTo })} />
        <div className="flex min-w-0 items-end gap-2 md:col-span-2 xl:col-span-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="secondary" className="min-h-12 w-full sm:w-auto" onClick={onRefresh} disabled={loading}>
                {loading ? <Spinner size="sm" label="Actualizando pedidos" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                Actualizar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Actualizar pedidos</TooltipContent>
          </Tooltip>
          {hasActiveFilters ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" className="min-h-12 px-3" onClick={onReset} aria-label="Limpiar filtros">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpiar filtros</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SearchBox({
  orders,
  query,
  searching,
  onChange
}: {
  orders: Order[];
  query: string;
  searching: boolean;
  onChange: (query: string) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => getSearchSuggestions(orders, query), [orders, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">
        Buscar pedido
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          aria-controls={listId}
          aria-expanded={open}
          className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-28 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Numero, cliente o producto"
        />
        <span className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400", searching && "text-brand-700")}>
          {searching ? "Buscando..." : "Sugerencias"}
        </span>
      </div>
      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10"
        >
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.type}-${suggestion.value}-${suggestion.label}`}
              type="button"
              role="option"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => {
                onChange(suggestion.value);
                setOpen(false);
              }}
            >
              <span>
                <span className="font-semibold text-slate-900">{suggestion.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{suggestion.description}</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{suggestion.badge}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="block min-w-0 text-sm font-semibold text-slate-800">
      Fecha {label.toLocaleLowerCase("es-CL")}
      <div className="relative mt-2">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input id={inputId} type="date" className={dateClassName} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function getSearchSuggestions(orders: Order[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-CL");

  if (!normalizedQuery) {
    return [
      { type: "help", value: "", label: "Buscar por numero", description: "Usa el codigo del pedido.", badge: "Numero" },
      { type: "help", value: "", label: "Buscar por cliente", description: "Nombre o correo del cliente.", badge: "Cliente" },
      { type: "help", value: "", label: "Buscar por producto", description: "SKU o nombre del producto.", badge: "Producto" }
    ];
  }

  return orders
    .filter((order) => `${order.orderNumber} ${order.customer.fullName} ${order.customer.email}`.toLocaleLowerCase("es-CL").includes(normalizedQuery))
    .slice(0, 5)
    .map((order) => ({
      type: "order",
      value: order.orderNumber,
      label: order.orderNumber,
      description: order.customer.fullName,
      badge: getOrderStatusLabel(order.status)
    }));
}
