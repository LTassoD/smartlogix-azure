import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { inventoryApi } from "@/features/inventory/api/inventoryApi";
import type {
  CreateProductWithInitialStockRequest,
  CreateStockMovementRequest,
  InventoryFilters,
  InventoryItem,
  InventorySummary,
  UpdateProductWithMinimumStockRequest,
  WarehouseResponse
} from "@/features/inventory/types/inventoryTypes";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const DEFAULT_FILTERS: InventoryFilters = {
  query: "",
  stockStatus: "all",
  warehouseId: "all",
  activeOnly: true
};

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const loadedRef = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(filters.query, 400);

  const loadInventory = useCallback(async () => {
    const isInitialLoad = !loadedRef.current;

    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await inventoryApi.getInventory();
      setItems(response.items);
      setWarehouses(response.warehouses);
      loadedRef.current = true;
    } catch (loadError) {
      if (isInitialLoad) {
        setError(getSafeErrorMessage(loadError));
        setItems([]);
        setWarehouses([]);
      }
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const effectiveFilters = useMemo(() => ({ ...filters, query: debouncedQuery }), [debouncedQuery, filters]);
  const filteredItems = useMemo(() => filterInventory(items, effectiveFilters), [effectiveFilters, items]);
  const { paginatedItems, pagination, resetPage } = useClientPagination(filteredItems);
  const summary = useMemo(() => calculateSummary(items), [items]);
  const hasActiveFilters = filters.query.trim() !== "" || filters.stockStatus !== "all" || filters.warehouseId !== "all" || !filters.activeOnly;
  const searching = filters.query !== debouncedQuery;

  const updateFilters = useCallback((nextFilters: Partial<InventoryFilters>) => {
    resetPage();
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, [resetPage]);

  const resetFilters = useCallback(() => {
    resetPage();
    setFilters(DEFAULT_FILTERS);
  }, [resetPage]);

  const createProduct = useCallback(
    async (input: CreateProductWithInitialStockRequest) => {
      setSaving(true);
      setError(null);
      let productWasCreated = false;

      try {
        const product = await inventoryApi.createProduct(input.product);
        productWasCreated = true;

        if (input.stockSetup?.quantity) {
          await inventoryApi.createStockMovement({
            productId: product.id,
            warehouseId: input.stockSetup.warehouseId,
            type: "IN",
            quantity: input.stockSetup.quantity,
            reason: "Stock inicial"
          });
        }

        if (input.stockSetup && input.stockSetup.minimumStock >= 0) {
          await inventoryApi.updateMinimumStock(product.id, input.stockSetup.warehouseId, {
            minimumStock: input.stockSetup.minimumStock
          });
        }

        await loadInventory();
      } catch (createError) {
        if (productWasCreated) {
          await loadInventory().catch(() => undefined);
        }

        const safeMessage = productWasCreated
          ? "Producto registrado, pero no se pudo completar la configuracion de stock."
          : getSafeErrorMessage(createError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadInventory]
  );

  const updateProduct = useCallback(
    async (productId: number, input: UpdateProductWithMinimumStockRequest) => {
      setSaving(true);
      setError(null);

      try {
        await inventoryApi.updateProduct(productId, input.product);

        if (input.stockMinimum) {
          await inventoryApi.updateMinimumStock(productId, input.stockMinimum.warehouseId, {
            minimumStock: input.stockMinimum.minimumStock
          });
        }

        await loadInventory();
      } catch (updateError) {
        const safeMessage = getSafeErrorMessage(updateError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadInventory]
  );

  const createStockMovement = useCallback(
    async (input: CreateStockMovementRequest) => {
      setSaving(true);
      setError(null);

      try {
        await inventoryApi.createStockMovement(input);
        await loadInventory();
      } catch (movementError) {
        const safeMessage = getSafeErrorMessage(movementError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadInventory]
  );

  const deactivateProduct = useCallback(
    async (productId: number) => {
      setSaving(true);
      setError(null);

      try {
        await inventoryApi.deactivateProduct(productId);
        await loadInventory();
      } catch (deactivateError) {
        const safeMessage = getSafeErrorMessage(deactivateError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadInventory]
  );

  const getItemDetail = useCallback(async (productId: number) => inventoryApi.getInventoryItemById(productId), []);

  const loading = initialLoading || refreshing;

  return {
    items,
    filteredItems,
    paginatedItems,
    pagination,
    warehouses,
    filters,
    summary,
    loading,
    initialLoading,
    refreshing,
    saving,
    searching,
    error,
    isEmpty: !initialLoading && !error && items.length === 0,
    hasNoResults: !initialLoading && !error && items.length > 0 && filteredItems.length === 0,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    refresh: loadInventory,
    createProduct,
    updateProduct,
    createStockMovement,
    deactivateProduct,
    getItemDetail
  };
}

function filterInventory(items: InventoryItem[], filters: InventoryFilters): InventoryItem[] {
  const query = normalizeText(filters.query);
  const selectedWarehouseId = filters.warehouseId === "all" ? null : Number(filters.warehouseId);

  return items.filter((item) => {
    if (filters.activeOnly && !item.active) {
      return false;
    }

    if (filters.stockStatus !== "all" && item.stockStatus !== filters.stockStatus) {
      return false;
    }

    if (selectedWarehouseId && !item.warehouseStocks.some((stock) => stock.warehouseId === selectedWarehouseId)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchableText = normalizeText(`${item.sku} ${item.name} ${item.description ?? ""}`);
    return searchableText.includes(query);
  });
}

function calculateSummary(items: InventoryItem[]): InventorySummary {
  return {
    totalProducts: items.length,
    availableStock: items.reduce((total, item) => total + Math.max(item.totalQuantity, 0), 0),
    lowStock: items.filter((item) => item.stockStatus === "low").length,
    outOfStock: items.filter((item) => item.stockStatus === "out").length
  };
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("es-CL");
}
