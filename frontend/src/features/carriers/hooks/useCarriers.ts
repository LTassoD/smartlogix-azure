import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carriersApi } from "@/features/carriers/api/carriersApi";
import {
  carrierToCarrier,
  type ApiCarrier,
  type Carrier,
  type CarrierFilters,
  type CarrierStatus,
  type CarrierSummary,
  type Shipment
} from "@/features/carriers/types/carrierTypes";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const DEFAULT_FILTERS: CarrierFilters = {
  query: "",
  status: "all",
  serviceType: "all"
};

export function useCarriers() {
  const [apiCarriers, setApiCarriers] = useState<ApiCarrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filters, setFilters] = useState<CarrierFilters>(DEFAULT_FILTERS);
  const loadedRef = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(filters.query, 400);

  const carriers = useMemo(() => apiCarriers.map((carrier) => carrierToCarrier(carrier, shipments)), [apiCarriers, shipments]);
  const effectiveFilters = useMemo(() => ({ ...filters, query: debouncedQuery }), [debouncedQuery, filters]);
  const filteredCarriers = useMemo(() => filterCarriers(carriers, effectiveFilters), [carriers, effectiveFilters]);
  const { paginatedItems: paginatedCarriers, pagination, resetPage } = useClientPagination(filteredCarriers);
  const summary = useMemo(() => calculateSummary(carriers), [carriers]);
  const serviceTypes = useMemo(() => getServiceTypes(carriers), [carriers]);
  const hasActiveFilters = Boolean(filters.query.trim() || filters.status !== "all" || filters.serviceType !== "all");
  const searching = filters.query !== debouncedQuery;

  const loadCarriers = useCallback(async () => {
    const isInitialLoad = !loadedRef.current;

    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);
    setReferenceError(null);

    const [carriersResult, shipmentsResult] = await Promise.allSettled([carriersApi.getCarriers(), carriersApi.getShipments()]);

    if (carriersResult.status === "fulfilled") {
      setApiCarriers(carriersResult.value);
      loadedRef.current = true;
    } else {
      if (isInitialLoad) {
        setApiCarriers([]);
        setError(getSafeErrorMessage(carriersResult.reason));
      }
    }

    if (shipmentsResult.status === "fulfilled") {
      setShipments(shipmentsResult.value);
    } else {
      if (isInitialLoad) {
        setShipments([]);
        setReferenceError(getSafeErrorMessage(shipmentsResult.reason));
      }
    }

    if (isInitialLoad) {
      setInitialLoading(false);
    } else {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCarriers();
  }, [loadCarriers]);

  const updateFilters = useCallback((nextFilters: Partial<CarrierFilters>) => {
    resetPage();
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, [resetPage]);

  const resetFilters = useCallback(() => {
    resetPage();
    setFilters(DEFAULT_FILTERS);
  }, [resetPage]);

  const updateAvailability = useCallback(
    async (carrier: Carrier, simulatedAvailable: boolean) => {
      setSaving(true);
      setError(null);

      try {
        await carriersApi.updateCarrierAvailability(carrier.id, { simulatedAvailable });
        await loadCarriers();
      } catch (availabilityError) {
        throw new Error(getSafeErrorMessage(availabilityError));
      } finally {
        setSaving(false);
      }
    },
    [loadCarriers]
  );

  const loading = initialLoading || refreshing;

  return {
    carriers,
    filteredCarriers,
    paginatedCarriers,
    pagination,
    shipments,
    filters,
    summary,
    serviceTypes,
    loading,
    initialLoading,
    refreshing,
    saving,
    searching,
    error,
    referenceError,
    isEmpty: !initialLoading && !error && carriers.length === 0,
    hasNoResults: !initialLoading && !error && carriers.length > 0 && filteredCarriers.length === 0,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    refresh: loadCarriers,
    updateAvailability
  };
}

function filterCarriers(carriers: Carrier[], filters: CarrierFilters): Carrier[] {
  const query = normalizeText(filters.query);

  return carriers.filter((carrier) => {
    if (filters.status !== "all" && carrier.status !== filters.status) {
      return false;
    }

    if (filters.serviceType !== "all" && carrier.serviceType !== filters.serviceType) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeText(
      [
        carrier.code,
        carrier.name,
        carrier.serviceType ?? "",
        carrier.status,
        ...carrier.assignedShipments.flatMap((shipment) => [shipment.shipmentNumber, shipment.orderNumber, shipment.destinationCity ?? ""])
      ].join(" ")
    ).includes(query);
  });
}

function calculateSummary(carriers: Carrier[]): CarrierSummary {
  return {
    totalCarriers: carriers.length,
    activeCarriers: carriers.filter((carrier) => carrier.active).length,
    inactiveCarriers: carriers.filter((carrier) => !carrier.active).length,
    availableCarriers: carriers.filter((carrier) => carrier.active && carrier.simulatedAvailable).length,
    unavailableCarriers: carriers.filter((carrier) => carrier.active && !carrier.simulatedAvailable).length,
    assignedShipments: carriers.reduce((total, carrier) => total + carrier.assignedShipments.length, 0)
  };
}

function getServiceTypes(carriers: Carrier[]): string[] {
  return Array.from(new Set(carriers.map((carrier) => carrier.serviceType).filter((serviceType): serviceType is string => Boolean(serviceType)))).sort(
    (first, second) => first.localeCompare(second, "es-CL")
  );
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("es-CL");
}

export type CarrierFilterStatus = CarrierStatus | "all";
