import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/utils/cn";

export type SearchableComboboxOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
};

type SearchableComboboxProps = {
  label: string;
  value: string;
  options: SearchableComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

export function SearchableCombobox({
  disabled = false,
  emptyMessage,
  error,
  label,
  onChange,
  options,
  placeholder,
  required = false,
  searchPlaceholder,
  value
}: SearchableComboboxProps) {
  const buttonId = useId();
  const listId = useId();
  const searchId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const filteredOptions = useMemo(() => filterOptions(options, query), [options, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={buttonId} className="block text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="ml-1 text-brand-600">*</span> : null}
      </label>
      <button
        id={buttonId}
        type="button"
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          error && "border-danger focus:border-danger focus:ring-red-600/15"
        )}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className="min-w-0">
          <span className={cn("block truncate font-semibold", !selectedOption && "font-medium text-slate-400")}>
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.description ? <span className="mt-0.5 block truncate text-xs text-slate-500">{selectedOption.description}</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} aria-hidden="true" />
      </button>

      {error ? <span className="mt-2 block text-sm font-medium leading-5 text-danger">{error}</span> : null}

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-[10001] mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10"
        >
          <div className="border-b border-slate-100 p-2">
            <label htmlFor={searchId} className="sr-only">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                ref={searchRef}
                id={searchId}
                className="block min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/15"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{option.label}</span>
                    {option.description ? <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {option.badge ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{option.badge}</span> : null}
                    {option.value === value ? <Check className="h-4 w-4 text-brand-700" aria-hidden="true" /> : null}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-center text-sm text-slate-500">{emptyMessage}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function filterOptions(options: SearchableComboboxOption[], query: string): SearchableComboboxOption[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => normalizeText(`${option.label} ${option.description ?? ""} ${option.badge ?? ""}`).includes(normalizedQuery));
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("es-CL");
}
