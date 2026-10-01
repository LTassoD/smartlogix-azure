import { useCallback, useEffect, useMemo, useState } from "react";
import { getUiPreferences } from "@/lib/ui/uiPreferences";

export type ClientPaginationState = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const DEFAULT_PAGE_SIZE = 10;

export function useClientPagination<T>(items: readonly T[], initialPageSize?: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getValidPageSize(initialPageSize ?? getUiPreferences().defaultPageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = clamp(page, 1, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;

    return items.slice(startIndex, startIndex + pageSize);
  }, [items, pageSize, safePage]);

  const onPageChange = useCallback(
    (nextPage: number) => {
      setPage(clamp(nextPage, 1, totalPages));
    },
    [totalPages]
  );

  const onPageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(getValidPageSize(nextPageSize));
    setPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  return {
    paginatedItems,
    pagination: {
      page: safePage,
      totalPages,
      totalItems,
      pageSize,
      onPageChange,
      onPageSizeChange
    },
    resetPage
  };
}

function getValidPageSize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PAGE_SIZE;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
