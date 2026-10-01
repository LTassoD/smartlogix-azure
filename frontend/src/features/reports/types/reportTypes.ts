import type { ApiCarrier, Shipment } from "@/features/carriers/types/carrierTypes";
import type { InventoryItem, InventoryListResponse, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import type { ApiOrder, Order } from "@/features/orders/types/orderTypes";
import type { WarehouseMovement } from "@/features/warehouses/types/warehouseTypes";

export type ReportType = "general" | "inventory" | "orders" | "shipments" | "carriers" | "warehouses";

export type ReportFilters = {
  dateFrom: string;
  dateTo: string;
  reportType: ReportType;
  status: string;
  warehouseId: string;
  carrierCode: string;
};

export type ReportsSourceData = {
  inventory: InventoryListResponse | null;
  apiOrders: ApiOrder[];
  orders: Order[];
  shipments: Shipment[];
  carriers: ApiCarrier[];
  movements: WarehouseMovement[];
  errors: string[];
};

export type ReportsApiResponse = {
  inventory: InventoryListResponse | null;
  apiOrders: ApiOrder[];
  shipments: Shipment[];
  carriers: ApiCarrier[];
  movements: WarehouseMovement[];
  errors: string[];
};

export type ReportMetric = {
  title: string;
  value: number;
  supportingText: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export type ReportSummary = {
  productsRegistered: number;
  totalOrders: number;
  pendingOrders: number;
  shipmentsInTransit: number;
  deliveredShipments: number;
  incidents: number;
  activeCarriers: number;
  activeWarehouses: number;
};

export type ReportChartDatum = {
  label: string;
  value: number;
  helper?: string;
  tone?: "slate" | "blue" | "cyan" | "green" | "yellow" | "red";
};

export type InventoryReport = {
  totalStock: number;
  lowStockProducts: InventoryItem[];
  outOfStockProducts: InventoryItem[];
  criticalProducts: InventoryItem[];
  stockByWarehouse: ReportChartDatum[];
};

export type OrdersReport = {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  ordersByStatus: ReportChartDatum[];
  latestOrders: Order[];
};

export type ShipmentsReport = {
  totalShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  incidentShipments: number;
  unassignedShipments: Shipment[];
  shipmentsByStatus: ReportChartDatum[];
  latestShipments: Shipment[];
};

export type CarriersReport = {
  activeCarriers: number;
  unavailableCarriers: number;
  shipmentsByCarrier: ReportChartDatum[];
  carriers: ApiCarrier[];
};

export type WarehousesReport = {
  activeWarehouses: number;
  stockByWarehouse: ReportChartDatum[];
  productsByWarehouse: ReportChartDatum[];
  warehouses: WarehouseResponse[];
  movements: WarehouseMovement[];
};

export type ReportCsvRow = {
  seccion: string;
  registro: string;
  nombre: string;
  codigo: string;
  estado: string;
  fecha: string;
  bodega: string;
  stock: string;
  stockMinimo: string;
  cliente: string;
  total: string;
  transportista: string;
  detalle: string;
};

export type ReportsData = {
  summary: ReportSummary;
  inventory: InventoryReport;
  orders: OrdersReport;
  shipments: ShipmentsReport;
  carriers: CarriersReport;
  warehouses: WarehousesReport;
  csvRows: ReportCsvRow[];
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  general: "General",
  inventory: "Inventario",
  orders: "Pedidos",
  shipments: "Envios",
  carriers: "Transportistas",
  warehouses: "Bodegas"
};
