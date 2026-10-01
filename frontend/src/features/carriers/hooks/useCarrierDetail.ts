import { useCallback, useRef, useState } from "react";
import { carriersApi } from "@/features/carriers/api/carriersApi";
import { carrierToCarrier, type Carrier, type Shipment, type ShipmentStatusHistoryEvent } from "@/features/carriers/types/carrierTypes";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";

export function useCarrierDetail() {
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [history, setHistory] = useState<ShipmentStatusHistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const openCarrier = useCallback(async (carrierId: number) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const [carrierResponse, shipmentsResponse] = await Promise.all([carriersApi.getCarrierById(carrierId), carriersApi.getShipments()]);
      const carrierShipments = shipmentsResponse.filter((shipment) => shipment.carrier?.id === carrierResponse.id);
      const firstShipmentWithHistory = carrierShipments[0];
      const historyResponse = firstShipmentWithHistory ? await carriersApi.getShipmentHistory(firstShipmentWithHistory.id).catch(() => []) : [];

      if (requestIdRef.current === requestId) {
        setCarrier(carrierToCarrier(carrierResponse, shipmentsResponse));
        setShipments(carrierShipments);
        setHistory(historyResponse);
      }
    } catch (detailError) {
      if (requestIdRef.current === requestId) {
        setCarrier(null);
        setShipments([]);
        setHistory([]);
        setError(getSafeErrorMessage(detailError));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const closeCarrier = useCallback(() => {
    requestIdRef.current += 1;
    setCarrier(null);
    setShipments([]);
    setHistory([]);
    setLoading(false);
    setError(null);
  }, []);

  return {
    carrier,
    shipments,
    history,
    loading,
    error,
    openCarrier,
    closeCarrier
  };
}
