import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Carrier, CarrierFilters as CarrierFiltersState, CarrierStatus } from "@/features/carriers/types/carrierTypes";
import { cn } from "@/utils/cn";

type CarriersFiltersProps = {
  filters: CarrierFiltersState;
  carriers: Carrier[];
  serviceTypes: string[];
  loading: boolean;
  searching: boolean;
  hasActiveFilters: boolean;
  onChange: (filters: Partial<CarrierFiltersState>) => void;
  onReset: () => void;
  onRefresh: () => void;
};

const statusOptions: Array<{ value: CarrierStatus | "all"; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "ACTIVE", label: "Disponible" },
  { value: "UNAVAILABLE", label: "No disponible" },
  { value: "INACTIVE", label: "Inactivo" }
];

const selectClassName =
  "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function CarriersFilters({
  carriers,
  filters,
  hasActiveFilters,
  loading,
  onChange,
  onRefresh,
  onReset,
  searching,
  serviceTypes
}: CarriersFiltersProps) {
  const fieldClassName = "block min-w-0 text-sm font-semibold text-slate-800";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SearchBox carriers={carriers} query={filters.query} searching={searching} onChange={(query) => onChange({ query })} />

        <label className={fieldClassName}>
          Estado
          <select
            className={selectClassName}
            value={filters.status}
            onChange={(event) => onChange({ status: event.target.value as CarrierFiltersState["status"] })}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClassName}>
          Servicio
          <select
            className={selectClassName}
            value={filters.serviceType}
            onChange={(event) => onChange({ serviceType: event.target.value })}
            disabled={serviceTypes.length === 0}
          >
            <option value="all">Todos los servicios</option>
            {serviceTypes.map((serviceType) => (
              <option key={serviceType} value={serviceType}>
                {formatServiceType(serviceType)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex min-w-0 items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="secondary" className="min-h-12 w-full sm:w-auto" onClick={onRefresh} disabled={loading}>
                {loading ? <Spinner size="sm" label="Actualizando transportistas" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                Actualizar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Actualizar transportistas</TooltipContent>
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
  carriers,
  query,
  searching,
  onChange
}: {
  carriers: Carrier[];
  query: string;
  searching: boolean;
  onChange: (query: string) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => getSearchSuggestions(carriers, query), [carriers, query]);

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
        Buscar transportista
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
          placeholder="Nombre, codigo o servicio"
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

function getSearchSuggestions(carriers: Carrier[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-CL");

  if (!normalizedQuery) {
    return [
      { type: "help", value: "", label: "Buscar por nombre", description: "Ej. Chilexpress", badge: "Nombre" },
      { type: "help", value: "", label: "Buscar por codigo", description: "Ej. CHILEXPRESS", badge: "Codigo" },
      { type: "help", value: "", label: "Buscar por servicio", description: "Ej. Nacional o Express", badge: "Servicio" }
    ];
  }

  return carriers
    .filter((carrier) => `${carrier.code} ${carrier.name} ${carrier.serviceType ?? ""}`.toLocaleLowerCase("es-CL").includes(normalizedQuery))
    .slice(0, 5)
    .map((carrier) => ({
      type: "carrier",
      value: carrier.code,
      label: carrier.name,
      description: `${carrier.code} · ${formatServiceType(carrier.serviceType)}`,
      badge: "Transportista"
    }));
}

function formatServiceType(value: string | null): string {
  if (!value) {
    return "No informado";
  }

  return value
    .toLocaleLowerCase("es-CL")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1))
    .join(" ");
}
