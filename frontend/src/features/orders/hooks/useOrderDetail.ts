import { useCallback, useRef, useState } from "react";
import {
  apiOrderDetailToOrderDetail,
  ordersApi,
  type OrderNormalizerContext
} from "@/features/orders/api/ordersApi";
import type { Order } from "@/features/orders/types/orderTypes";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";

export function useOrderDetail(context: OrderNormalizerContext) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const openOrder = useCallback(
    async (orderId: number) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const detail = await ordersApi.getOrderById(orderId);
        const historyResult = await ordersApi.getOrderHistory(orderId).catch(() => detail.history);

        if (requestIdRef.current === requestId) {
          setOrder(apiOrderDetailToOrderDetail({ ...detail, history: historyResult }, context));
        }
      } catch (detailError) {
        if (requestIdRef.current === requestId) {
          setError(getSafeErrorMessage(detailError));
          setOrder(null);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [context]
  );

  const closeOrder = useCallback(() => {
    requestIdRef.current += 1;
    setOrder(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    order,
    loading,
    error,
    openOrder,
    closeOrder
  };
}
