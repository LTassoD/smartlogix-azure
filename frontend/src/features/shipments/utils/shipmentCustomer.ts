export const UNKNOWN_SHIPMENT_CUSTOMER_NAME = "Cliente no informado";

const GENERATED_CUSTOMER_LABEL_PATTERN = /^cliente\s+\d+$/i;
const DIRECT_CUSTOMER_NAME_KEYS = ["customerName", "customerFullName", "clientName", "nombreCliente"] as const;
const NESTED_CUSTOMER_NAME_KEYS = [
  "fullName",
  "name",
  "customerName",
  "customerFullName",
  "clientName",
  "nombreCliente"
] as const;

type ShipmentCustomerTarget = {
  orderId: number;
  orderNumber: string;
  customerName: string;
};

export type ShipmentCustomerOrderSource = {
  id: number;
  orderNumber: string;
  customer: {
    fullName?: string | null;
    name?: string | null;
    customerName?: string | null;
    customerFullName?: string | null;
    clientName?: string | null;
    nombreCliente?: string | null;
  };
};

export function readShipmentCustomerName(record: Record<string, unknown>): string {
  return (
    readStringCandidate(record, DIRECT_CUSTOMER_NAME_KEYS) ??
    readNestedCustomerName(record.customer) ??
    readNestedCustomerName(record.client) ??
    readNestedOrderCustomerName(record.order) ??
    UNKNOWN_SHIPMENT_CUSTOMER_NAME
  );
}

export function enrichShipmentCustomerNames<TShipment extends ShipmentCustomerTarget>(
  shipments: TShipment[],
  orders: ShipmentCustomerOrderSource[]
): TShipment[] {
  const orderNamesById = new Map<number, string>();
  const orderNamesByNumber = new Map<string, string>();

  orders.forEach((order) => {
    const customerName = readOrderCustomerName(order);

    if (!customerName) {
      return;
    }

    orderNamesById.set(order.id, customerName);
    orderNamesByNumber.set(order.orderNumber, customerName);
  });

  return shipments.map((shipment) => {
    const orderCustomerName = orderNamesById.get(shipment.orderId) ?? orderNamesByNumber.get(shipment.orderNumber);
    const customerName = orderCustomerName ?? normalizeCustomerName(shipment.customerName) ?? UNKNOWN_SHIPMENT_CUSTOMER_NAME;

    if (customerName === shipment.customerName) {
      return shipment;
    }

    return {
      ...shipment,
      customerName
    };
  });
}

export function getShipmentCustomerDisplayName(shipment: Pick<ShipmentCustomerTarget, "customerName">): string {
  return normalizeCustomerName(shipment.customerName) ?? UNKNOWN_SHIPMENT_CUSTOMER_NAME;
}

function readOrderCustomerName(order: ShipmentCustomerOrderSource): string | null {
  return readStringCandidate(order.customer, NESTED_CUSTOMER_NAME_KEYS);
}

function readNestedOrderCustomerName(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return readStringCandidate(value, DIRECT_CUSTOMER_NAME_KEYS) ?? readNestedCustomerName(value.customer);
}

function readNestedCustomerName(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return readStringCandidate(value, NESTED_CUSTOMER_NAME_KEYS);
}

function readStringCandidate(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const normalized = normalizeCustomerName(record[key]);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeCustomerName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || GENERATED_CUSTOMER_LABEL_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
