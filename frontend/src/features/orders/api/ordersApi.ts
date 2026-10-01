import { createValidationError } from "@/lib/api/apiErrors";
import type { Shipment } from "@/features/carriers/types/carrierTypes";
import type { ApiResponse } from "@/lib/api/apiTypes";
import { httpClient } from "@/lib/api/httpClient";
import type {
  ApiOrder,
  ApiOrderCustomer,
  ApiOrderItem,
  ApiOrderTimelineEvent,
  CreateCustomerRequest,
  CreateOrderRequest,
  Order,
  OrderDetailResponse,
  OrderFormDraftItem,
  OrderItem,
  OrderListResponse,
  OrderTimelineEvent,
  UpdateOrderStatusRequest
} from "@/features/orders/types/orderTypes";
import {
  ORDER_STATUS_LABELS,
  getOrderStatusLabel,
  isOrderStatus
} from "@/features/orders/types/orderTypes";

type Parser<T> = (value: unknown) => T;

export type OrderNormalizerContext = {
  warehouses?: Array<{ id: number; code: string; name: string }>;
  stock?: Array<{ productId: number; warehouseId: number; quantity: number }>;
  shipments?: Shipment[];
};

const ORDERS_PATH = "/api/orders";
const CUSTOMERS_PATH = "/api/orders/customers";

export const ordersApi = {
  async getOrders(): Promise<ApiOrder[]> {
    const response = await httpClient.get<ApiResponse<ApiOrder[]>>(ORDERS_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseOrder), "orders response")
    });

    return response.data;
  },

  async getOrderById(id: number): Promise<ApiOrder> {
    const response = await httpClient.get<ApiResponse<ApiOrder>>(`${ORDERS_PATH}/${id}`, {
      parse: (value) => parseApiResponse(value, parseOrder, "order detail response")
    });

    return response.data;
  },

  async getOrderByNumber(orderNumber: string): Promise<ApiOrder> {
    const response = await httpClient.get<ApiResponse<ApiOrder>>(`${ORDERS_PATH}/number/${encodeURIComponent(orderNumber)}`, {
      parse: (value) => parseApiResponse(value, parseOrder, "order number response")
    });

    return response.data;
  },

  async getOrdersByCustomer(customerId: number): Promise<ApiOrder[]> {
    const response = await httpClient.get<ApiResponse<ApiOrder[]>>(`${ORDERS_PATH}/customer/${customerId}`, {
      parse: (value) => parseApiResponse(value, parseArray(parseOrder), "customer orders response")
    });

    return response.data;
  },

  async getOrderHistory(id: number): Promise<ApiOrderTimelineEvent[]> {
    const response = await httpClient.get<ApiResponse<ApiOrderTimelineEvent[]>>(`${ORDERS_PATH}/${id}/history`, {
      parse: (value) => parseApiResponse(value, parseArray(parseTimelineEvent), "order history response")
    });

    return response.data;
  },

  async createOrder(input: CreateOrderRequest): Promise<ApiOrder> {
    const response = await httpClient.post<ApiResponse<ApiOrder>>(ORDERS_PATH, {
      body: input,
      parse: (value) => parseApiResponse(value, parseOrder, "create order response")
    });

    return response.data;
  },

  async confirmOrder(id: number): Promise<ApiOrder> {
    const response = await httpClient.patch<ApiResponse<ApiOrder>>(`${ORDERS_PATH}/${id}/confirm`, {
      parse: (value) => parseApiResponse(value, parseOrder, "confirm order response")
    });

    return response.data;
  },

  async cancelOrder(id: number): Promise<ApiOrder> {
    const response = await httpClient.patch<ApiResponse<ApiOrder>>(`${ORDERS_PATH}/${id}/cancel`, {
      parse: (value) => parseApiResponse(value, parseOrder, "cancel order response")
    });

    return response.data;
  },

  async updateOrderStatus(id: number, input: UpdateOrderStatusRequest): Promise<ApiOrder> {
    const response = await httpClient.patch<ApiResponse<ApiOrder>>(`${ORDERS_PATH}/${id}/status`, {
      body: input,
      parse: (value) => parseApiResponse(value, parseOrder, "update order status response")
    });

    return response.data;
  },

  async getCustomers(): Promise<ApiOrderCustomer[]> {
    const response = await httpClient.get<ApiResponse<ApiOrderCustomer[]>>(CUSTOMERS_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseCustomer), "customers response")
    });

    return response.data;
  },

  async createCustomer(input: CreateCustomerRequest): Promise<ApiOrderCustomer> {
    const response = await httpClient.post<ApiResponse<ApiOrderCustomer>>(CUSTOMERS_PATH, {
      body: input,
      parse: (value) => parseApiResponse(value, parseCustomer, "create customer response")
    });

    return response.data;
  }
};

export function apiOrderToOrder(apiOrder: ApiOrder, context: OrderNormalizerContext = {}): Order {
  const items = apiOrder.items.map((item) => apiOrderItemToOrderItem(item, context));
  const history = apiOrder.history.map(apiTimelineEventToTimelineEvent);
  const warehouseIds = Array.from(new Set(items.map((item) => item.warehouseId)));
  const warehouseNames = Array.from(
    new Set(items.map((item) => item.warehouseName).filter((warehouseName): warehouseName is string => Boolean(warehouseName)))
  );

  return {
    ...apiOrder,
    items,
    history,
    shipment: context.shipments?.find((shipment) => shipment.orderId === apiOrder.id) ?? null,
    itemCount: items.length,
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    warehouseIds,
    warehouseNames
  };
}

export function apiOrderDetailToOrderDetail(apiOrder: ApiOrder, context: OrderNormalizerContext = {}): OrderDetailResponse {
  return apiOrderToOrder(apiOrder, context);
}

export function apiOrdersToOrderList(apiOrders: ApiOrder[], context: OrderNormalizerContext = {}): OrderListResponse {
  return apiOrders.map((order) => apiOrderToOrder(order, context));
}

export function orderFormToCreateRequest(customerId: number, items: OrderFormDraftItem[], notes: string): CreateOrderRequest {
  const trimmedNotes = notes.trim();

  return {
    customerId,
    notes: trimmedNotes || undefined,
    items: items.map((item) => ({
      productId: item.productId,
      warehouseId: item.warehouseId,
      sku: item.sku,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity
    }))
  };
}

function apiOrderItemToOrderItem(item: ApiOrderItem, context: OrderNormalizerContext): OrderItem {
  const warehouse = context.warehouses?.find((candidate) => candidate.id === item.warehouseId);
  const stock = context.stock?.find((candidate) => candidate.productId === item.productId && candidate.warehouseId === item.warehouseId);

  return {
    ...item,
    warehouseName: warehouse?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    availableStock: stock?.quantity ?? null
  };
}

function apiTimelineEventToTimelineEvent(event: ApiOrderTimelineEvent): OrderTimelineEvent {
  const statusLabel = ORDER_STATUS_LABELS[event.newStatus] ?? getOrderStatusLabel(event.newStatus);

  return {
    ...event,
    title: statusLabel,
    description: getTimelineDescription(event.comment, event.newStatus)
  };
}

function getTimelineDescription(comment: string | null, status: string): string {
  const trimmedComment = comment?.trim();

  if (!trimmedComment) {
    return getOrderStatusLabel(status);
  }

  const normalizedComment = trimmedComment.toLocaleLowerCase("es-CL");

  if (normalizedComment === "order created") {
    return "Pedido registrado.";
  }

  if (normalizedComment === "order confirmed") {
    return "Pedido confirmado.";
  }

  if (normalizedComment === "order cancelled") {
    return "Pedido cancelado.";
  }

  return trimmedComment;
}

function parseApiResponse<T>(value: unknown, dataParser: Parser<T>, context: string): ApiResponse<T> {
  if (!isRecord(value)) {
    throw createValidationError(`${context} must be an object`, value);
  }

  if (typeof value.success !== "boolean") {
    throw createValidationError(`${context} must include boolean success`, value);
  }

  if (typeof value.message !== "string") {
    throw createValidationError(`${context} must include string message`, value);
  }

  return {
    success: value.success,
    message: value.message,
    data: dataParser(value.data)
  };
}

function parseArray<T>(itemParser: Parser<T>): Parser<T[]> {
  return (value: unknown) => {
    if (!Array.isArray(value)) {
      throw createValidationError("array response expected", value);
    }

    return value.map(itemParser);
  };
}

function parseOrder(value: unknown): ApiOrder {
  if (!isRecord(value)) {
    throw createValidationError("order must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    orderNumber: readString(value, "orderNumber"),
    customer: parseCustomer(value.customer),
    status: readStatus(value, "status"),
    totalAmount: readNumber(value, "totalAmount"),
    notes: readOptionalString(value, "notes"),
    items: parseArray(parseOrderItem)(value.items),
    history: parseArray(parseTimelineEvent)(value.history),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt")
  };
}

function parseCustomer(value: unknown): ApiOrderCustomer {
  if (!isRecord(value)) {
    throw createValidationError("customer must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    fullName: readString(value, "fullName"),
    email: readString(value, "email"),
    phone: readOptionalString(value, "phone"),
    address: readOptionalString(value, "address"),
    active: readBoolean(value, "active"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt")
  };
}

function parseOrderItem(value: unknown): ApiOrderItem {
  if (!isRecord(value)) {
    throw createValidationError("order item must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    productId: readNumber(value, "productId"),
    warehouseId: readNumber(value, "warehouseId"),
    sku: readString(value, "sku"),
    productName: readString(value, "productName"),
    unitPrice: readNumber(value, "unitPrice"),
    quantity: readNumber(value, "quantity"),
    subtotal: readNumber(value, "subtotal")
  };
}

function parseTimelineEvent(value: unknown): ApiOrderTimelineEvent {
  if (!isRecord(value)) {
    throw createValidationError("order history must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    previousStatus: readNullableStatus(value, "previousStatus"),
    newStatus: readStatus(value, "newStatus"),
    comment: readOptionalString(value, "comment"),
    createdAt: readString(value, "createdAt")
  };
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw createValidationError(`${key} must be a number`, record);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== "string") {
    throw createValidationError(`${key} must be a string`, record);
  }

  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw createValidationError(`${key} must be a string`, record);
  }

  return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw createValidationError(`${key} must be a boolean`, record);
  }

  return value;
}

function readStatus(record: Record<string, unknown>, key: string) {
  const value = readString(record, key);

  if (!isOrderStatus(value)) {
    throw createValidationError(`${key} must be a valid order status`, record);
  }

  return value;
}

function readNullableStatus(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !isOrderStatus(value)) {
    throw createValidationError(`${key} must be a valid order status`, record);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
