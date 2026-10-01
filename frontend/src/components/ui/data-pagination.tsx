import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { cn } from "@/utils/cn";

export type DataPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

type PageToken = number | "start-ellipsis" | "end-ellipsis";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

export function DataPagination({
  className,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  totalItems,
  totalPages
}: DataPaginationProps) {
  const normalizedTotalItems = Math.max(0, totalItems);
  const normalizedTotalPages = Math.max(1, totalPages);
  const currentPage = clamp(page, 1, normalizedTotalPages);
  const currentPageSize = Math.max(1, pageSize);
  const startItem = normalizedTotalItems === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const endItem = normalizedTotalItems === 0 ? 0 : Math.min(currentPage * currentPageSize, normalizedTotalItems);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < normalizedTotalPages;
  const pageTokens = getPageTokens(currentPage, normalizedTotalPages);

  function goToPage(nextPage: number) {
    const boundedPage = clamp(nextPage, 1, normalizedTotalPages);

    if (boundedPage !== currentPage) {
      onPageChange(boundedPage);
    }
  }

  return (
    <div className={cn("border-t border-slate-200 px-4 py-3 sm:px-5", className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600" aria-live="polite">
            Mostrando {startItem.toLocaleString("es-CL")} a {endItem.toLocaleString("es-CL")} de{" "}
            {normalizedTotalItems.toLocaleString("es-CL")} registros
          </p>

          {onPageSizeChange ? (
            <label className="flex w-full items-center justify-between gap-2 text-sm font-medium text-slate-600 sm:w-auto sm:justify-start">
              <span>Filas por pagina</span>
              <select
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                value={currentPageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                aria-label="Filas por pagina"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <Pagination className="hidden justify-end sm:flex">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious disabled={!canGoPrevious} onClick={() => goToPage(currentPage - 1)} />
            </PaginationItem>
            {pageTokens.map((token) => (
              <PaginationItem key={token}>
                {typeof token === "number" ? (
                  <PaginationLink
                    isActive={token === currentPage}
                    onClick={() => goToPage(token)}
                    aria-label={token === currentPage ? `Pagina ${token}, actual` : `Ir a la pagina ${token}`}
                  >
                    {token}
                  </PaginationLink>
                ) : (
                  <PaginationEllipsis />
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext disabled={!canGoNext} onClick={() => goToPage(currentPage + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <Pagination className="sm:hidden">
          <PaginationContent className="w-full justify-between">
            <PaginationItem>
              <PaginationPrevious disabled={!canGoPrevious} onClick={() => goToPage(currentPage - 1)} />
            </PaginationItem>
            <PaginationItem>
              <span className="inline-flex h-9 items-center rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                Pagina {currentPage.toLocaleString("es-CL")} de {normalizedTotalPages.toLocaleString("es-CL")}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext disabled={!canGoNext} onClick={() => goToPage(currentPage + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

function getPageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const startPage = Math.max(2, page - 1);
  const endPage = Math.min(totalPages - 1, page + 1);

  if (startPage > 2) {
    tokens.push("start-ellipsis");
  }

  for (let candidate = startPage; candidate <= endPage; candidate += 1) {
    tokens.push(candidate);
  }

  if (endPage < totalPages - 1) {
    tokens.push("end-ellipsis");
  }

  tokens.push(totalPages);

  return tokens;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
