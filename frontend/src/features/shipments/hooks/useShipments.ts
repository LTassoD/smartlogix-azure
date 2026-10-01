import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useClientPagination } from "@/hooks/useClientPagination";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";
import { ordersApi } from "@/features/orders/api/ordersApi";
import { shipmentsApi } from "@/features/shipments/api/shipmentsApi";
import type {
  Shipment,
  ShipmentCarrier,
  ShipmentFilters,
  ShipmentStatus,
  ShipmentSummary,
  UpdateShipmentStatusRequest
} from "@/features/shipments/types/shipmentTypes";
import { enrichShipmentCustomerNames } from "@/features/shipments/utils/shipmentCustomer";

const DEFAULT_FILTERS: ShipmentFilters = {
  query: "",
  status: "all",
  carrierCode: "all"
};

export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filters, setFilters] = useState<ShipmentFilters>(DEFAULT_FILTERS);
  const loadedRef = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(filters.query, 400);

  const effectiveFilters = useMemo(() => ({ ...filters, query: debouncedQuery }), [debouncedQuery, filters]);
  const filteredShipments = useMemo(() => filterShipments(shipments, effectiveFilters), [effectiveFilters, shipments]);
  const { paginatedItems: paginatedShipments, pagination, resetPage } = useClientPagination(filteredShipments);
  const summary = useMemo(() => calculateSummary(shipments), [shipments]);
  const carriers = useMemo(() => getShipmentCarriers(shipments), [shipments]);
  const hasActiveFilters = Boolean(filters.query.trim() || filters.status !== "all" || filters.carrierCode !== "all");
  const searching = filters.query !== debouncedQuery;

  const loadShipments = useCallback(async () => {
    const isInitialLoad = !loadedRef.current;

    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [shipmentsResult, ordersResult] = await Promise.allSettled([shipmentsApi.getShipments(), ordersApi.getOrders()]);

      if (shipmentsResult.status === "rejected") {
        throw shipmentsResult.reason;
      }

      setShipments(
        ordersResult.status === "fulfilled"
          ? enrichShipmentCustomerNames(shipmentsResult.value, ordersResult.value)
          : shipmentsResult.value
      );
      loadedRef.current = true;
    } catch (loadError) {
      if (isInitialLoad) {
        setShipments([]);
        setError(getSafeErrorMessage(loadError));
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
    void loadShipments();
  }, [loadShipments]);

  const updateFilters = useCallback((nextFilters: Partial<ShipmentFilters>) => {
    resetPage();
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, [resetPage]);

  const resetFilters = useCallback(() => {
    resetPage();
    setFilters(DEFAULT_FILTERS);
  }, [resetPage]);

  const updateShipmentStatus = useCallback(
    async (shipmentId: number, input: UpdateShipmentStatusRequest) => {
      setSaving(true);
      setError(null);

      try {
        await shipmentsApi.updateShipmentStatus(shipmentId, input);
        await loadShipments();
      } catch (statusError) {
        throw new Error(getSafeErrorMessage(statusError));
      } finally {
        setSaving(false);
      }
    },
    [loadShipments]
  );

  const cancelShipment = useCallback(
    async (shipmentId: number) => {
      setSaving(true);
      setError(null);

      try {
        await shipmentsApi.cancelShipment(shipmentId);
        await loadShipments();
      } catch (cancelError) {
        throw new Error(getSafeErrorMessage(cancelError));
      } finally {
        setSaving(false);
      }
    },
    [loadShipments]
  );

  const loading = initialLoading || refreshing;

  return {
    shipments,
    filteredShipments,
    paginatedShipments,
    pagination,
    filters,
    summary,
    carriers,
    loading,
    initialLoading,
    refreshing,
    saving,
    searching,
    error,
    isEmpty: !initialLoading && !error && shipments.length === 0,
    hasNoResults: !initialLoading && !error && shipments.length > 0 && filteredShipments.length === 0,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    refresh: loadShipments,
    updateShipmentStatus,
    cancelShipment
  };
}

function filterShipments(shipments: Shipment[], filters: ShipmentFilters): Shipment[] {
  const query = normalizeText(filters.query);

  return shipments.filter((shipment) => {
    if (filters.status !== "all" && shipment.status !== filters.status) {
      return false;
    }

    if (filters.carrierCode !== "all" && shipment.carrier?.code !== filters.carrierCode) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeText(
      [
        shipment.shipmentNumber,
        shipment.orderNumber,
        shipment.customerName,
        shipment.carrier?.name ?? "",
        shipment.carrier?.code ?? "",
        shipment.trackingCode ?? "",
        shipment.destinationCity ?? "",
        shipment.status
      ].join(" ")
    ).includes(query);
  });
}

function calculateSummary(shipments: Shipment[]): ShipmentSummary {
  return {
    totalShipments: shipments.length,
    pendingShipments: shipments.filter((shipment) => shipment.status === "CREATED" || shipment.status === "PENDING_ASSIGNMENT").length,
    assignedShipments: shipments.filter((shipment) => shipment.status === "ASSIGNED").length,
    inTransitShipments: shipments.filter((shipment) => shipment.status === "IN_TRANSIT").length,
    deliveredShipments: shipments.filter((shipment) => shipment.status === "DELIVERED").length,
    incidentShipments: shipments.filter((shipment) => shipment.status === "FAILED" || shipment.status === "CANCELLED").length
  };
}

function getShipmentCarriers(shipments: Shipment[]): ShipmentCarrier[] {
  const carriers = new Map<string, ShipmentCarrier>();

  shipments.forEach((shipment) => {
    if (shipment.carrier) {
      carriers.set(shipment.carrier.code, shipment.carrier);
    }
  });

  return Array.from(carriers.values()).sort((first, second) => first.name.localeCompare(second.name, "es-CL"));
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("es-CL");
}

export type ShipmentFilterStatus = ShipmentStatus | "all";
