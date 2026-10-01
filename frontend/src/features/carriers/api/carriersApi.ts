import { createValidationError } from "@/lib/api/apiErrors";
import type { ApiResponse } from "@/lib/api/apiTypes";
import { httpClient } from "@/lib/api/httpClient";
import type {
  ApiCarrier,
  ApiShipment,
  AssignCarrierRequest,
  CreateShipmentRequest,
  ShipmentStatus,
  ShipmentStatusHistoryEvent,
  UpdateCarrierAvailabilityRequest,
  UpdateShipmentStatusRequest
} from "@/features/carriers/types/carrierTypes";
import { isShipmentStatus } from "@/features/carriers/types/carrierTypes";
import { readShipmentCustomerName } from "@/features/shipments/utils/shipmentCustomer";

type Parser<T> = (value: unknown) => T;

const CARRIERS_PATH = "/api/shipping/carriers";
const SHIPMENTS_PATH = "/api/shipping/shipments";

export const carriersApi = {
  async getCarriers(): Promise<ApiCarrier[]> {
    const response = await httpClient.get<ApiResponse<ApiCarrier[]>>(CARRIERS_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseCarrier), "carriers response")
    });

    return response.data;
  },

  async getCarrierById(id: number): Promise<ApiCarrier> {
    const response = await httpClient.get<ApiResponse<ApiCarrier>>(`${CARRIERS_PATH}/${id}`, {
      parse: (value) => parseApiResponse(value, parseCarrier, "carrier detail response")
    });

    return response.data;
  },

  async updateCarrierAvailability(id: number, input: UpdateCarrierAvailabilityRequest): Promise<ApiCarrier> {
    const response = await httpClient.patch<ApiResponse<ApiCarrier>>(`${CARRIERS_PATH}/${id}/availability`, {
      body: input,
      parse: (value) => parseApiResponse(value, parseCarrier, "carrier availability response")
    });

    return response.data;
  },

  async getShipments(): Promise<ApiShipment[]> {
    const response = await httpClient.get<ApiResponse<ApiShipment[]>>(SHIPMENTS_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseShipment), "shipments response")
    });

    return response.data;
  },

  async getShipmentByOrderId(orderId: number): Promise<ApiShipment> {
    const response = await httpClient.get<ApiResponse<ApiShipment>>(`${SHIPMENTS_PATH}/order/${orderId}`, {
      parse: (value) => parseApiResponse(value, parseShipment, "order shipment response")
    });

    return response.data;
  },

  async createShipment(input: CreateShipmentRequest): Promise<ApiShipment> {
    const response = await httpClient.post<ApiResponse<ApiShipment>>(SHIPMENTS_PATH, {
      body: input,
      parse: (value) => parseApiResponse(value, parseShipment, "create shipment response")
    });

    return response.data;
  },

  async assignCarrierToShipment(shipmentId: number, input: AssignCarrierRequest): Promise<ApiShipment> {
    const response = await httpClient.patch<ApiResponse<ApiShipment>>(`${SHIPMENTS_PATH}/${shipmentId}/assign-carrier`, {
      body: input,
      parse: (value) => parseApiResponse(value, parseShipment, "carrier assignment response")
    });

    return response.data;
  },

  async updateShipmentStatus(shipmentId: number, input: UpdateShipmentStatusRequest): Promise<ApiShipment> {
    const response = await httpClient.patch<ApiResponse<ApiShipment>>(`${SHIPMENTS_PATH}/${shipmentId}/status`, {
      body: input,
      parse: (value) => parseApiResponse(value, parseShipment, "shipment status response")
    });

    return response.data;
  },

  async getShipmentHistory(shipmentId: number): Promise<ShipmentStatusHistoryEvent[]> {
    const response = await httpClient.get<ApiResponse<ShipmentStatusHistoryEvent[]>>(`${SHIPMENTS_PATH}/${shipmentId}/history`, {
      parse: (value) => parseApiResponse(value, parseArray(parseShipmentHistoryEvent), "shipment history response")
    });

    return response.data;
  }
};

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

function parseCarrier(value: unknown): ApiCarrier {
  if (!isRecord(value)) {
    throw createValidationError("carrier must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    code: readString(value, "code"),
    name: readString(value, "name"),
    serviceType: readOptionalString(value, "serviceType"),
    active: readBoolean(value, "active"),
    simulatedAvailable: readBoolean(value, "simulatedAvailable"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt")
  };
}

function parseShipment(value: unknown): ApiShipment {
  if (!isRecord(value)) {
    throw createValidationError("shipment must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    shipmentNumber: readString(value, "shipmentNumber"),
    orderId: readNumber(value, "orderId"),
    orderNumber: readString(value, "orderNumber"),
    customerId: readNumber(value, "customerId"),
    customerName: readShipmentCustomerName(value),
    carrier: value.carrier === null || value.carrier === undefined ? null : parseCarrier(value.carrier),
    status: readShipmentStatus(value, "status"),
    destinationAddress: readOptionalString(value, "destinationAddress"),
    destinationCity: readOptionalString(value, "destinationCity"),
    trackingCode: readOptionalString(value, "trackingCode"),
    fallbackReason: readOptionalString(value, "fallbackReason"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt"),
    assignedAt: readOptionalString(value, "assignedAt"),
    shippedAt: readOptionalString(value, "shippedAt"),
    deliveredAt: readOptionalString(value, "deliveredAt")
  };
}

function parseShipmentHistoryEvent(value: unknown): ShipmentStatusHistoryEvent {
  if (!isRecord(value)) {
    throw createValidationError("shipment history must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    previousStatus: readNullableShipmentStatus(value, "previousStatus"),
    newStatus: readShipmentStatus(value, "newStatus"),
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

function readShipmentStatus(record: Record<string, unknown>, key: string): ShipmentStatus {
  const value = readString(record, key);

  if (!isShipmentStatus(value)) {
    throw createValidationError(`${key} must be a valid shipment status`, record);
  }

  return value;
}

function readNullableShipmentStatus(record: Record<string, unknown>, key: string): ShipmentStatus | null {
  const value = record[key];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !isShipmentStatus(value)) {
    throw createValidationError(`${key} must be a valid shipment status`, record);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
