import type { Shipment } from "@/features/carriers/types/carrierTypes";

export const ORDER_STATUSES = [
  "CREATED",
  "CONFIRMED",
  "CANCELLED",
  "PREPARING",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderPriority = never;

export type OrderStatusBadgeVariant = "warning" | "blue" | "violet" | "cyan" | "success" | "danger" | "neutral";

export type ApiOrderCustomer = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiOrderItem = {
  id: number;
  productId: number;
  warehouseId: number;
  sku: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type ApiOrderTimelineEvent = {
  id: number;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  comment: string | null;
  createdAt: string;
};

export type ApiOrder = {
  id: number;
  orderNumber: string;
  customer: ApiOrderCustomer;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  items: ApiOrderItem[];
  history: ApiOrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type OrderCustomer = ApiOrderCustomer;

export type OrderItem = ApiOrderItem & {
  warehouseName: string | null;
  warehouseCode: string | null;
  availableStock: number | null;
};

export type OrderTimelineEvent = ApiOrderTimelineEvent & {
  title: string;
  description: string;
};

export type Order = Omit<ApiOrder, "items" | "history"> & {
  items: OrderItem[];
  history: OrderTimelineEvent[];
  shipment: Shipment | null;
  itemCount: number;
  totalQuantity: number;
  warehouseIds: number[];
  warehouseNames: string[];
};

export type OrderListResponse = Order[];

export type OrderDetailResponse = Order;

export type CreateOrderItemRequest = {
  productId: number;
  warehouseId: number;
  sku: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

export type CreateOrderRequest = {
  customerId: number;
  notes?: string;
  items: CreateOrderItemRequest[];
};

export type CreateCustomerRequest = {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
};

export type UpdateOrderStatusRequest = {
  status: OrderStatus;
  comment?: string;
};

export type CancelOrderRequest = void;

export type OrderFilters = {
  query: string;
  status: OrderStatus | "all";
  customerId: string;
  warehouseId: string;
  dateFrom: string;
  dateTo: string;
};

export type OrderSummary = {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  inProgressOrders: number;
  cancelledOrders: number;
  totalAmount: number;
};

export type OrderAvailabilityStatus = "available" | "insufficient" | "unknown" | "processed" | "stopped";

export type OrderAvailabilityIssue = {
  itemId: number;
  sku: string;
  productName: string;
  requestedQuantity: number;
  availableStock: number | null;
};

export type OrderAvailability = {
  status: OrderAvailabilityStatus;
  label: string;
  description: string;
  issues: OrderAvailabilityIssue[];
};

export type OrdersData = {
  orders: Order[];
  customers: OrderCustomer[];
};

export type OrderFormDraftItem = {
  draftId: string;
  productId: number;
  warehouseId: number;
  sku: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
  warehouseName: string;
  warehouseCode: string;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Pendiente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  PREPARING: "En preparacion",
  READY_FOR_SHIPPING: "Listo para despacho",
  SHIPPED: "En despacho",
  DELIVERED: "Entregado"
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  CREATED: "Pedido pendiente de confirmacion.",
  CONFIRMED: "Pedido confirmado para continuar su preparacion.",
  CANCELLED: "Pedido cancelado.",
  PREPARING: "Pedido en preparacion.",
  READY_FOR_SHIPPING: "Pedido listo para despacho.",
  SHIPPED: "Pedido en despacho.",
  DELIVERED: "Pedido entregado."
};

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  CANCELLED: [],
  PREPARING: ["READY_FOR_SHIPPING"],
  READY_FOR_SHIPPING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: []
};

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some((status) => status === value);
}

export function getOrderStatusLabel(status: string): string {
  if (isOrderStatus(status)) {
    return ORDER_STATUS_LABELS[status];
  }

  return status
    .toLocaleLowerCase("es-CL")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1))
    .join(" ");
}

export function orderStatusToBadgeVariant(status: string): OrderStatusBadgeVariant {
  if (status === "CREATED") {
    return "warning";
  }

  if (status === "CONFIRMED") {
    return "blue";
  }

  if (status === "PREPARING") {
    return "violet";
  }

  if (status === "READY_FOR_SHIPPING" || status === "SHIPPED") {
    return "cyan";
  }

  if (status === "DELIVERED") {
    return "success";
  }

  if (status === "CANCELLED") {
    return "danger";
  }

  return "neutral";
}
