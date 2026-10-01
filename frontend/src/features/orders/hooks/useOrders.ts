import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carriersApi } from "@/features/carriers/api/carriersApi";
import type { ApiShipment, Shipment } from "@/features/carriers/types/carrierTypes";
import { inventoryApi } from "@/features/inventory/api/inventoryApi";
import type { InventoryItem, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import {
  apiOrdersToOrderList,
  orderFormToCreateRequest,
  ordersApi,
  type OrderNormalizerContext
} from "@/features/orders/api/ordersApi";
import {
  ORDER_STATUS_TRANSITIONS,
  type ApiOrder,
  type CreateCustomerRequest,
  type Order,
  type OrderAvailability,
  type OrderFilters,
  type OrderFormDraftItem,
  type OrderStatus,
  type OrderSummary,
  type UpdateOrderStatusRequest
} from "@/features/orders/types/orderTypes";
import { ApiClientError, getSafeErrorMessage } from "@/lib/api/apiErrors";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const DEFAULT_FILTERS: OrderFilters = {
  query: "",
  status: "all",
  customerId: "all",
  warehouseId: "all",
  dateFrom: "",
  dateTo: ""
};

export type RegisterOrderInput = {
  customerId?: number;
  newCustomer?: CreateCustomerRequest;
  notes: string;
  items: OrderFormDraftItem[];
};

export function useOrders() {
  const [apiOrders, setApiOrders] = useState<ApiOrder[]>([]);
  const [customers, setCustomers] = useState<CreateCustomerResponse[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const loadedRef = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(filters.query, 400);

  const normalizerContext = useMemo(() => buildNormalizerContext(inventoryItems, warehouses, shipments), [inventoryItems, shipments, warehouses]);
  const orders = useMemo(() => apiOrdersToOrderList(apiOrders, normalizerContext), [apiOrders, normalizerContext]);
  const effectiveFilters = useMemo(() => ({ ...filters, query: debouncedQuery }), [debouncedQuery, filters]);
  const filteredOrders = useMemo(() => filterOrders(orders, effectiveFilters), [effectiveFilters, orders]);
  const { paginatedItems: paginatedOrders, pagination, resetPage } = useClientPagination(filteredOrders);
  const summary = useMemo(() => calculateSummary(orders), [orders]);
  const hasActiveFilters = Boolean(
    filters.query.trim() || filters.status !== "all" || filters.customerId !== "all" || filters.warehouseId !== "all" || filters.dateFrom || filters.dateTo
  );
  const searching = filters.query !== debouncedQuery;

  const loadOrders = useCallback(async () => {
    const isInitialLoad = !loadedRef.current;

    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);
    setReferenceError(null);

    const [ordersResult, customersResult, inventoryResult] = await Promise.allSettled([
      ordersApi.getOrders(),
      ordersApi.getCustomers(),
      inventoryApi.getInventory()
    ]);

    if (ordersResult.status === "fulfilled") {
      setApiOrders(ordersResult.value);
      loadedRef.current = true;
    } else {
      if (isInitialLoad) {
        setApiOrders([]);
        setError(getSafeErrorMessage(ordersResult.reason));
      }
    }

    if (customersResult.status === "fulfilled") {
      setCustomers(customersResult.value);
    } else {
      if (isInitialLoad) {
        setCustomers([]);
        setReferenceError(getSafeErrorMessage(customersResult.reason));
      }
    }

    if (inventoryResult.status === "fulfilled") {
      setInventoryItems(inventoryResult.value.items);
      setWarehouses(inventoryResult.value.warehouses);
    } else {
      if (isInitialLoad) {
        setInventoryItems([]);
        setWarehouses([]);
        setReferenceError((current) => current ?? getSafeErrorMessage(inventoryResult.reason));
      }
    }

    const shipmentsResult = await carriersApi.getShipments().catch((shipmentError: unknown) => shipmentError);

    if (Array.isArray(shipmentsResult)) {
      setShipments(shipmentsResult);
    } else {
      if (isInitialLoad) {
        setShipments([]);
        setReferenceError((current) => current ?? getSafeErrorMessage(shipmentsResult));
      }
    }

    if (isInitialLoad) {
      setInitialLoading(false);
    } else {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateFilters = useCallback((nextFilters: Partial<OrderFilters>) => {
    resetPage();
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, [resetPage]);

  const resetFilters = useCallback(() => {
    resetPage();
    setFilters(DEFAULT_FILTERS);
  }, [resetPage]);

  const registerOrder = useCallback(
    async (input: RegisterOrderInput) => {
      setSaving(true);
      setDispatching(true);
      setError(null);

      try {
        const customerId = input.customerId ?? (await createCustomerForOrder(input.newCustomer)).id;
        await ordersApi.createOrder(orderFormToCreateRequest(customerId, input.items, input.notes));
        await loadOrders();
      } catch (createError) {
        const safeMessage = getSafeErrorMessage(createError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadOrders]
  );

  const confirmOrder = useCallback(
    async (order: Order) => {
      const availability = getOrderAvailability(order);

      if (availability.status === "insufficient") {
        throw new Error("No hay stock suficiente para uno o mas productos.");
      }

      if (availability.status === "unknown") {
        throw new Error("No fue posible confirmar la disponibilidad de productos.");
      }

      setSaving(true);
      setError(null);

      try {
        await ordersApi.confirmOrder(order.id);
        await loadOrders();
      } catch (confirmError) {
        const safeMessage = getSafeErrorMessage(confirmError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadOrders]
  );

  const cancelOrder = useCallback(
    async (orderId: number) => {
      setSaving(true);
      setError(null);

      try {
        await ordersApi.cancelOrder(orderId);
        await loadOrders();
      } catch (cancelError) {
        const safeMessage = getSafeErrorMessage(cancelError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadOrders]
  );

  const updateOrderStatus = useCallback(
    async (orderId: number, input: UpdateOrderStatusRequest) => {
      setSaving(true);
      setError(null);

      try {
        await ordersApi.updateOrderStatus(orderId, input);
        await loadOrders();
      } catch (statusError) {
        const safeMessage = getSafeErrorMessage(statusError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
      }
    },
    [loadOrders]
  );

  const dispatchOrder = useCallback(
    async (order: Order, input: DispatchOrderInput) => {
      if (!input.carrierCode.trim()) {
        throw new Error("Selecciona un transportista para continuar.");
      }

      setSaving(true);
      setError(null);

      try {
        const shipment = await resolveShipmentForOrder(order, input.destinationCity);
        const preparedShipment = await prepareShipmentForDispatch(shipment, input);

        if (preparedShipment.status === "FAILED") {
          throw new Error("No hay transportistas disponibles para asignar.");
        }

        if (preparedShipment.status !== "IN_TRANSIT") {
          throw new Error("No fue posible preparar el despacho.");
        }

        await ordersApi.updateOrderStatus(order.id, {
          status: "SHIPPED",
          comment: input.comment?.trim() || "Pedido en despacho"
        });
        await loadOrders();
      } catch (dispatchError) {
        if (isUserFacingDispatchError(dispatchError)) {
          throw dispatchError;
        }

        const safeMessage = getSafeErrorMessage(dispatchError);
        throw new Error(safeMessage);
      } finally {
        setSaving(false);
        setDispatching(false);
      }
    },
    [loadOrders]
  );

  const loading = initialLoading || refreshing;

  return {
    orders,
    filteredOrders,
    paginatedOrders,
    pagination,
    customers,
    shipments,
    inventoryItems,
    warehouses,
    filters,
    summary,
    normalizerContext,
    loading,
    initialLoading,
    refreshing,
    saving,
    dispatching,
    searching,
    error,
    referenceError,
    isEmpty: !initialLoading && !error && orders.length === 0,
    hasNoResults: !initialLoading && !error && orders.length > 0 && filteredOrders.length === 0,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    refresh: loadOrders,
    registerOrder,
    confirmOrder,
    cancelOrder,
    updateOrderStatus,
    dispatchOrder,
    getAvailability: getOrderAvailability,
    getNextStatuses
  };
}

type CreateCustomerResponse = Awaited<ReturnType<typeof ordersApi.getCustomers>>[number];

export type DispatchOrderInput = {
  carrierCode: string;
  destinationCity?: string;
  comment?: string;
};

async function createCustomerForOrder(input?: CreateCustomerRequest): Promise<CreateCustomerResponse> {
  if (!input) {
    throw new Error("Selecciona un cliente para registrar el pedido.");
  }

  return ordersApi.createCustomer(input);
}

async function resolveShipmentForOrder(order: Order, destinationCity?: string): Promise<ApiShipment> {
  if (order.shipment) {
    return order.shipment;
  }

  try {
    return await carriersApi.getShipmentByOrderId(order.id);
  } catch (shipmentError) {
    if (!isNotFoundError(shipmentError)) {
      throw shipmentError;
    }

    const destinationAddress = order.customer.address?.trim();
    const trimmedCity = destinationCity?.trim();

    if (!destinationAddress || !trimmedCity) {
      throw new Error("No existe un despacho asociado y faltan datos de destino.");
    }

    return carriersApi.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customer.id,
      destinationAddress,
      destinationCity: trimmedCity
    });
  }
}

async function prepareShipmentForDispatch(shipment: ApiShipment, input: DispatchOrderInput): Promise<ApiShipment> {
  const trimmedCity = input.destinationCity?.trim();
  const comment = input.comment?.trim() || "Despacho iniciado";

  if (shipment.status === "CREATED" || shipment.status === "PENDING_ASSIGNMENT" || shipment.status === "FAILED") {
    const assignedShipment = await carriersApi.assignCarrierToShipment(shipment.id, {
      carrierCode: input.carrierCode.trim(),
      destinationCity: trimmedCity || undefined
    });

    if (assignedShipment.status !== "ASSIGNED") {
      return assignedShipment;
    }

    return carriersApi.updateShipmentStatus(assignedShipment.id, {
      status: "IN_TRANSIT",
      comment
    });
  }

  if (shipment.status === "ASSIGNED") {
    return carriersApi.updateShipmentStatus(shipment.id, {
      status: "IN_TRANSIT",
      comment
    });
  }

  return shipment;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

function isUserFacingDispatchError(error: unknown): error is Error {
  if (!(error instanceof Error) || error instanceof ApiClientError) {
    return false;
  }

  return [
    "Selecciona un transportista para continuar.",
    "No existe un despacho asociado y faltan datos de destino.",
    "No hay transportistas disponibles para asignar.",
    "No fue posible preparar el despacho."
  ].includes(error.message);
}

function buildNormalizerContext(inventoryItems: InventoryItem[], warehouses: WarehouseResponse[], shipments: Shipment[]): OrderNormalizerContext {
  return {
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name
    })),
    stock: inventoryItems.flatMap((item) =>
      item.warehouseStocks.map((stock) => ({
        productId: item.productId,
        warehouseId: stock.warehouseId,
        quantity: stock.quantity
      }))
    ),
    shipments
  };
}

function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const query = normalizeText(filters.query);
  const selectedCustomerId = filters.customerId === "all" ? null : Number(filters.customerId);
  const selectedWarehouseId = filters.warehouseId === "all" ? null : Number(filters.warehouseId);
  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : null;

  return orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) {
      return false;
    }

    if (selectedCustomerId && order.customer.id !== selectedCustomerId) {
      return false;
    }

    if (selectedWarehouseId && !order.warehouseIds.includes(selectedWarehouseId)) {
      return false;
    }

    const createdAtTime = Date.parse(order.createdAt);

    if (dateFrom && (Number.isNaN(createdAtTime) || createdAtTime < dateFrom)) {
      return false;
    }

    if (dateTo && (Number.isNaN(createdAtTime) || createdAtTime > dateTo)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeText(
      [
        order.orderNumber,
        order.customer.fullName,
        order.customer.email,
        order.customer.phone ?? "",
        order.notes ?? "",
        order.shipment?.carrier?.name ?? "",
        order.shipment?.trackingCode ?? "",
        order.shipment?.shipmentNumber ?? "",
        ...order.items.flatMap((item) => [item.sku, item.productName])
      ].join(" ")
    ).includes(query);
  });
}

function calculateSummary(orders: Order[]): OrderSummary {
  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === "CREATED").length,
    confirmedOrders: orders.filter((order) => order.status === "CONFIRMED").length,
    inProgressOrders: orders.filter((order) => order.status === "PREPARING" || order.status === "READY_FOR_SHIPPING" || order.status === "SHIPPED").length,
    cancelledOrders: orders.filter((order) => order.status === "CANCELLED").length,
    totalAmount: orders.reduce((total, order) => total + order.totalAmount, 0)
  };
}

function getOrderAvailability(order: Order): OrderAvailability {
  if (order.status === "CANCELLED") {
    return {
      status: "stopped",
      label: "Detenido",
      description: "El pedido fue cancelado.",
      issues: []
    };
  }

  if (order.status !== "CREATED") {
    return {
      status: "processed",
      label: "Confirmado",
      description: "El pedido ya continuo su procesamiento.",
      issues: []
    };
  }

  const issues = order.items
    .filter((item) => item.availableStock === null || item.availableStock < item.quantity)
    .map((item) => ({
      itemId: item.id,
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableStock: item.availableStock
    }));

  if (issues.some((issue) => issue.availableStock !== null)) {
    return {
      status: "insufficient",
      label: "Insuficiente",
      description: "Uno o mas productos no tienen stock suficiente.",
      issues
    };
  }

  if (issues.length > 0) {
    return {
      status: "unknown",
      label: "Sin datos",
      description: "No fue posible confirmar disponibilidad.",
      issues
    };
  }

  return {
    status: "available",
    label: "Disponible",
    description: "Los productos tienen disponibilidad suficiente.",
    issues: []
  };
}

function getNextStatuses(order: Order): OrderStatus[] {
  if (order.status === "CREATED") {
    return [];
  }

  return ORDER_STATUS_TRANSITIONS[order.status].filter((status) => status !== "CANCELLED");
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("es-CL");
}
