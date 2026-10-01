import { useCallback, useRef, useState } from "react";
import { warehousesApi } from "@/features/warehouses/api/warehousesApi";
import type { Warehouse } from "@/features/warehouses/types/warehouseTypes";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";

export function useWarehouseDetail() {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const openWarehouse = useCallback(async (warehouseId: number) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const detail = await warehousesApi.getWarehouseDetail(warehouseId);

      if (requestIdRef.current === requestId) {
        setWarehouse(detail);
      }
    } catch (detailError) {
      if (requestIdRef.current === requestId) {
        setWarehouse(null);
        setError(getSafeErrorMessage(detailError));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const closeWarehouse = useCallback(() => {
    requestIdRef.current += 1;
    setWarehouse(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    warehouse,
    loading,
    error,
    openWarehouse,
    closeWarehouse
  };
}
