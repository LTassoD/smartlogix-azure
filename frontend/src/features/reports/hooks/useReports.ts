import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiOrdersToOrderList, type OrderNormalizerContext } from "@/features/orders/api/ordersApi";
import { getOrderStatusLabel, type Order } from "@/features/orders/types/orderTypes";
import { getCarrierStatus, getShipmentStatusLabel, type ApiCarrier, type Shipment } from "@/features/carriers/types/carrierTypes";
import { reportsApi } from "@/features/reports/api/reportsApi";
import type {
  CarriersReport,
  InventoryReport,
  OrdersReport,
  ReportChartDatum,
  ReportCsvRow,
  ReportFilters,
  ReportsData,
  ReportsSourceData,
  ReportSummary,
  ShipmentsReport,
  WarehousesReport
} from "@/features/reports/types/reportTypes";
import type { InventoryItem, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import { enrichShipmentCustomerNames } from "@/features/shipments/utils/shipmentCustomer";
import type { WarehouseMovement } from "@/features/warehouses/types/warehouseTypes";

const DEFAULT_FILTERS: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  reportType: "general",
  status: "all",
  warehouseId: "all",
  carrierCode: "all"
};

export function useReports() {
  const [source, setSource] = useState<ReportsSourceData>({
    inventory: null,
    apiOrders: [],
    orders: [],
    shipments: [],
    carriers: [],
    movements: [],
    errors: []
  });
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const loadedRef = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const isInitialLoad = !loadedRef.current;

    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await reportsApi.getReportsData();
      const shipments = enrichShipmentCustomerNames(response.shipments, response.apiOrders);
      const normalizerContext = buildOrderContext(response.inventory?.items ?? [], response.inventory?.warehouses ?? [], shipments);
      const orders = apiOrdersToOrderList(response.apiOrders, normalizerContext);
      const nextSource: ReportsSourceData = {
        ...response,
        shipments,
        orders
      };

      setSource(nextSource);
      loadedRef.current = true;

      if (response.errors.length > 0 && !hasAnySourceData(nextSource)) {
        setError(response.errors[0] ?? "No fue posible cargar reportes.");
      }
    } catch {
      if (isInitialLoad) {
        setSource({
          inventory: null,
          apiOrders: [],
          orders: [],
          shipments: [],
          carriers: [],
          movements: [],
          errors: []
        });
        setError("No fue posible cargar reportes.");
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
    void loadReports();
  }, [loadReports]);

  const filteredSource = useMemo(() => filterReportsSource(source, filters), [filters, source]);
  const data = useMemo(() => buildReportsData(filteredSource), [filteredSource]);
  const warehouses = source.inventory?.warehouses ?? [];
  const carriers = source.carriers;
  const statusOptions = useMemo(() => getStatusOptions(source.orders, source.shipments), [source.orders, source.shipments]);
  const hasActiveFilters = Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.reportType !== "general" ||
      filters.status !== "all" ||
      filters.warehouseId !== "all" ||
      filters.carrierCode !== "all"
  );
  const hasNoResults = !initialLoading && !error && hasAnySourceData(source) && !hasAnySourceData(filteredSource);

  const updateFilters = useCallback((nextFilters: Partial<ReportFilters>) => {
    setFilters((current) => ({ ...current, ...nextFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const loading = initialLoading || refreshing;

  return {
    source,
    filteredSource,
    data,
    filters,
    warehouses,
    carriers,
    statusOptions,
    loading,
    initialLoading,
    refreshing,
    error,
    referenceError: source.errors[0] ?? null,
    isEmpty: !initialLoading && !error && !hasAnySourceData(source),
    hasNoResults,
    hasActiveFilters,
    updateFilters,
    resetFilters,
    refresh: loadReports
  };
}

function buildOrderContext(items: InventoryItem[], warehouses: WarehouseResponse[], shipments: Shipment[]): OrderNormalizerContext {
  return {
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name
    })),
    stock: items.flatMap((item) =>
      item.warehouseStocks.map((stock) => ({
        productId: item.productId,
        warehouseId: stock.warehouseId,
        quantity: stock.quantity
      }))
    ),
    shipments
  };
}

function filterReportsSource(source: ReportsSourceData, filters: ReportFilters): ReportsSourceData {
  const selectedWarehouseId = filters.warehouseId === "all" ? null : Number(filters.warehouseId);
  const selectedCarrierCode = filters.carrierCode === "all" ? null : filters.carrierCode;

  const items = source.inventory?.items.filter((item) => {
    if (selectedWarehouseId && !item.warehouseStocks.some((stock) => stock.warehouseId === selectedWarehouseId)) {
      return false;
    }

    return true;
  });
  const inventory = source.inventory && items ? { ...source.inventory, items } : source.inventory;
  const orders = source.orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) {
      return false;
    }

    if (selectedWarehouseId && !order.warehouseIds.includes(selectedWarehouseId)) {
      return false;
    }

    return isInDateRange(order.createdAt, filters.dateFrom, filters.dateTo);
  });
  const shipments = source.shipments.filter((shipment) => {
    if (filters.status !== "all" && shipment.status !== filters.status) {
      return false;
    }

    if (selectedCarrierCode && shipment.carrier?.code !== selectedCarrierCode) {
      return false;
    }

    return isInDateRange(shipment.createdAt, filters.dateFrom, filters.dateTo);
  });
  const carriers = selectedCarrierCode ? source.carriers.filter((carrier) => carrier.code === selectedCarrierCode) : source.carriers;
  const movements = source.movements.filter((movement) => {
    if (selectedWarehouseId && movement.warehouseId !== selectedWarehouseId) {
      return false;
    }

    return isInDateRange(movement.createdAt, filters.dateFrom, filters.dateTo);
  });

  return {
    ...source,
    inventory,
    orders,
    shipments,
    carriers,
    movements
  };
}

function buildReportsData(source: ReportsSourceData): ReportsData {
  const inventory = buildInventoryReport(source.inventory?.items ?? [], source.inventory?.warehouses ?? []);
  const orders = buildOrdersReport(source.orders);
  const shipments = buildShipmentsReport(source.shipments);
  const carriers = buildCarriersReport(source.carriers, source.shipments);
  const warehouses = buildWarehousesReport(source.inventory?.warehouses ?? [], source.inventory?.items ?? [], source.movements);
  const summary = buildSummary(source.inventory?.items ?? [], source.orders, source.shipments, source.carriers, source.inventory?.warehouses ?? []);

  return {
    summary,
    inventory,
    orders,
    shipments,
    carriers,
    warehouses,
    csvRows: buildCsvRows(source)
  };
}

function buildSummary(
  items: InventoryItem[],
  orders: Order[],
  shipments: Shipment[],
  carriers: ApiCarrier[],
  warehouses: WarehouseResponse[]
): ReportSummary {
  return {
    productsRegistered: items.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === "CREATED").length,
    shipmentsInTransit: shipments.filter((shipment) => shipment.status === "IN_TRANSIT").length,
    deliveredShipments: shipments.filter((shipment) => shipment.status === "DELIVERED").length,
    incidents: shipments.filter((shipment) => shipment.status === "FAILED" || shipment.status === "CANCELLED").length,
    activeCarriers: carriers.filter((carrier) => carrier.active).length,
    activeWarehouses: warehouses.filter((warehouse) => warehouse.active).length
  };
}

function buildInventoryReport(items: InventoryItem[], warehouses: WarehouseResponse[]): InventoryReport {
  const lowStockProducts = items.filter((item) => item.stockStatus === "low");
  const outOfStockProducts = items.filter((item) => item.stockStatus === "out");

  return {
    totalStock: items.reduce((total, item) => total + Math.max(item.totalQuantity, 0), 0),
    lowStockProducts,
    outOfStockProducts,
    criticalProducts: [...outOfStockProducts, ...lowStockProducts].slice(0, 8),
    stockByWarehouse: buildStockByWarehouse(items, warehouses)
  };
}

function buildOrdersReport(orders: Order[]): OrdersReport {
  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === "CREATED").length,
    confirmedOrders: orders.filter((order) => order.status === "CONFIRMED").length,
    cancelledOrders: orders.filter((order) => order.status === "CANCELLED").length,
    ordersByStatus: countOrdersByStatus(orders),
    latestOrders: [...orders].sort(sortByCreatedDesc).slice(0, 8)
  };
}

function buildShipmentsReport(shipments: Shipment[]): ShipmentsReport {
  return {
    totalShipments: shipments.length,
    inTransitShipments: shipments.filter((shipment) => shipment.status === "IN_TRANSIT").length,
    deliveredShipments: shipments.filter((shipment) => shipment.status === "DELIVERED").length,
    incidentShipments: shipments.filter((shipment) => shipment.status === "FAILED" || shipment.status === "CANCELLED").length,
    unassignedShipments: shipments.filter((shipment) => !shipment.carrier).slice(0, 8),
    shipmentsByStatus: countShipmentsByStatus(shipments),
    latestShipments: [...shipments].sort(sortByCreatedDesc).slice(0, 8)
  };
}

function buildCarriersReport(carriers: ApiCarrier[], shipments: Shipment[]): CarriersReport {
  return {
    activeCarriers: carriers.filter((carrier) => carrier.active).length,
    unavailableCarriers: carriers.filter((carrier) => getCarrierStatus(carrier) === "UNAVAILABLE").length,
    shipmentsByCarrier: countShipmentsByCarrier(shipments),
    carriers
  };
}

function buildWarehousesReport(warehouses: WarehouseResponse[], items: InventoryItem[], movements: WarehouseMovement[]): WarehousesReport {
  return {
    activeWarehouses: warehouses.filter((warehouse) => warehouse.active).length,
    stockByWarehouse: buildStockByWarehouse(items, warehouses),
    productsByWarehouse: buildProductsByWarehouse(items, warehouses),
    warehouses,
    movements: [...movements].sort(sortByCreatedDesc).slice(0, 8)
  };
}

function buildStockByWarehouse(items: InventoryItem[], warehouses: WarehouseResponse[]): ReportChartDatum[] {
  return warehouses.map((warehouse) => {
    const totalStock = items.reduce((total, item) => {
      const stock = item.warehouseStocks.find((candidate) => candidate.warehouseId === warehouse.id);
      return total + Math.max(stock?.quantity ?? 0, 0);
    }, 0);

    return {
      label: warehouse.name,
      value: totalStock,
      helper: warehouse.code,
      tone: "blue"
    };
  });
}

function buildProductsByWarehouse(items: InventoryItem[], warehouses: WarehouseResponse[]): ReportChartDatum[] {
  return warehouses.map((warehouse) => ({
    label: warehouse.name,
    value: items.filter((item) => item.warehouseStocks.some((stock) => stock.warehouseId === warehouse.id)).length,
    helper: warehouse.code,
    tone: "slate"
  }));
}

function countOrdersByStatus(orders: Order[]): ReportChartDatum[] {
  const counts = new Map<string, number>();
  orders.forEach((order) => counts.set(order.status, (counts.get(order.status) ?? 0) + 1));

  return Array.from(counts.entries()).map(([status, value]) => ({
    label: getOrderStatusLabel(status),
    value,
    tone: status === "CANCELLED" ? "red" : status === "DELIVERED" ? "green" : "blue"
  }));
}

function countShipmentsByStatus(shipments: Shipment[]): ReportChartDatum[] {
  const counts = new Map<string, number>();
  shipments.forEach((shipment) => counts.set(shipment.status, (counts.get(shipment.status) ?? 0) + 1));

  return Array.from(counts.entries()).map(([status, value]) => ({
    label: getShipmentStatusLabel(status),
    value,
    tone: status === "FAILED" || status === "CANCELLED" ? "red" : status === "DELIVERED" ? "green" : "cyan"
  }));
}

function countShipmentsByCarrier(shipments: Shipment[]): ReportChartDatum[] {
  const counts = new Map<string, { label: string; value: number }>();

  shipments.forEach((shipment) => {
    const code = shipment.carrier?.code ?? "sin-asignar";
    const label = shipment.carrier?.name ?? "Sin asignar";
    const current = counts.get(code);
    counts.set(code, { label, value: (current?.value ?? 0) + 1 });
  });

  return Array.from(counts.values()).map((item) => ({
    label: item.label,
    value: item.value,
    tone: item.label === "Sin asignar" ? "yellow" : "blue"
  }));
}

function buildCsvRows(source: ReportsSourceData): ReportCsvRow[] {
  const rows: ReportCsvRow[] = [];
  const inventory = source.inventory;

  inventory?.items.forEach((item) => {
    if (item.warehouseStocks.length === 0) {
      rows.push({
        ...emptyCsvRow(),
        seccion: "Inventario",
        registro: "Producto",
        nombre: item.name,
        codigo: item.sku,
        estado: getInventoryStatusLabel(item.stockStatus),
        fecha: formatCsvDate(item.updatedAt),
        stock: formatNumber(item.totalQuantity),
        stockMinimo: formatNumber(item.minimumStock),
        total: formatCsvCurrency(item.unitPrice),
        detalle: item.description ?? ""
      });
      return;
    }

    item.warehouseStocks.forEach((stock) => {
      rows.push({
        ...emptyCsvRow(),
        seccion: "Inventario",
        registro: "Stock",
        nombre: item.name,
        codigo: item.sku,
        estado: getInventoryStatusLabel(item.stockStatus),
        fecha: formatCsvDate(stock.updatedAt),
        bodega: stock.warehouseName,
        stock: formatNumber(stock.quantity),
        stockMinimo: formatNumber(stock.minimumStock),
        total: formatCsvCurrency(item.unitPrice),
        detalle: item.description ?? ""
      });
    });
  });

  source.orders.forEach((order) => {
    rows.push({
      ...emptyCsvRow(),
      seccion: "Pedidos",
      registro: "Pedido",
      nombre: order.orderNumber,
      codigo: order.orderNumber,
      estado: getOrderStatusLabel(order.status),
      fecha: formatCsvDate(order.createdAt),
      bodega: order.warehouseNames.join(", "),
      cliente: order.customer.fullName,
      total: formatCsvCurrency(order.totalAmount),
      transportista: order.shipment?.carrier?.name ?? "",
      detalle: `${order.itemCount} productos`
    });
  });

  source.shipments.forEach((shipment) => {
    rows.push({
      ...emptyCsvRow(),
      seccion: "Envios",
      registro: "Envio",
      nombre: shipment.shipmentNumber,
      codigo: shipment.trackingCode ?? shipment.shipmentNumber,
      estado: getShipmentStatusLabel(shipment.status),
      fecha: formatCsvDate(shipment.createdAt),
      cliente: shipment.customerName,
      transportista: shipment.carrier?.name ?? "Sin asignar",
      detalle: shipment.destinationCity ?? shipment.destinationAddress ?? ""
    });
  });

  source.carriers.forEach((carrier) => {
    const status = getCarrierStatus(carrier);
    rows.push({
      ...emptyCsvRow(),
      seccion: "Transportistas",
      registro: "Transportista",
      nombre: carrier.name,
      codigo: carrier.code,
      estado: status === "ACTIVE" ? "Disponible" : status === "UNAVAILABLE" ? "No disponible" : "Inactivo",
      fecha: formatCsvDate(carrier.createdAt),
      transportista: carrier.name,
      detalle: carrier.serviceType ?? ""
    });
  });

  inventory?.warehouses.forEach((warehouse) => {
    const stock = inventory.items.reduce((total, item) => {
      const warehouseStock = item.warehouseStocks.find((candidate) => candidate.warehouseId === warehouse.id);
      return total + Math.max(warehouseStock?.quantity ?? 0, 0);
    }, 0);

    rows.push({
      ...emptyCsvRow(),
      seccion: "Bodegas",
      registro: "Bodega",
      nombre: warehouse.name,
      codigo: warehouse.code,
      estado: warehouse.active ? "Activa" : "Inactiva",
      fecha: formatCsvDate(warehouse.createdAt),
      bodega: warehouse.name,
      stock: formatNumber(stock),
      detalle: warehouse.address ?? ""
    });
  });

  source.movements.forEach((movement) => {
    rows.push({
      ...emptyCsvRow(),
      seccion: "Bodegas",
      registro: "Movimiento",
      nombre: movement.productName,
      codigo: movement.sku,
      estado: getMovementLabel(movement.type),
      fecha: formatCsvDate(movement.createdAt),
      bodega: movement.warehouseName,
      stock: formatNumber(movement.quantity),
      detalle: movement.reason ?? movement.referenceCode ?? ""
    });
  });

  return rows;
}

function getStatusOptions(orders: Order[], shipments: Shipment[]): Array<{ value: string; label: string }> {
  const options = new Map<string, string>();
  orders.forEach((order) => options.set(order.status, getOrderStatusLabel(order.status)));
  shipments.forEach((shipment) => options.set(shipment.status, getShipmentStatusLabel(shipment.status)));

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label, "es-CL"));
}

function hasAnySourceData(source: ReportsSourceData): boolean {
  return Boolean(
    (source.inventory?.items.length ?? 0) > 0 ||
      (source.inventory?.warehouses.length ?? 0) > 0 ||
      source.orders.length > 0 ||
      source.shipments.length > 0 ||
      source.carriers.length > 0 ||
      source.movements.length > 0
  );
}

function isInDateRange(value: string, dateFrom: string, dateTo: string): boolean {
  const date = Date.parse(value);

  if (Number.isNaN(date)) {
    return false;
  }

  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

function sortByCreatedDesc(first: { createdAt: string }, second: { createdAt: string }): number {
  return Date.parse(second.createdAt) - Date.parse(first.createdAt);
}

function emptyCsvRow(): ReportCsvRow {
  return {
    seccion: "",
    registro: "",
    nombre: "",
    codigo: "",
    estado: "",
    fecha: "",
    bodega: "",
    stock: "",
    stockMinimo: "",
    cliente: "",
    total: "",
    transportista: "",
    detalle: ""
  };
}

function formatCsvDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatCsvCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("es-CL");
}

function getInventoryStatusLabel(status: InventoryItem["stockStatus"]): string {
  if (status === "available") {
    return "Disponible";
  }

  if (status === "low") {
    return "Stock bajo";
  }

  if (status === "out") {
    return "Sin stock";
  }

  return "Inactivo";
}

function getMovementLabel(type: WarehouseMovement["type"]): string {
  if (type === "IN") {
    return "Ingreso";
  }

  if (type === "OUT" || type === "ORDER_OUT") {
    return "Salida";
  }

  return "Ajuste";
}
