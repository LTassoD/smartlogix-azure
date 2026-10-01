export const SHIPMENT_STATUSES = [
  "CREATED",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "FAILED"
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type CarrierStatus = "ACTIVE" | "INACTIVE" | "UNAVAILABLE";

export type CarrierCoverage = never;

export type CarrierServiceLevel = string;

export type ApiCarrier = {
  id: number;
  code: string;
  name: string;
  serviceType: string | null;
  active: boolean;
  simulatedAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiShipment = {
  id: number;
  shipmentNumber: string;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  carrier: ApiCarrier | null;
  status: ShipmentStatus;
  destinationAddress: string | null;
  destinationCity: string | null;
  trackingCode: string | null;
  fallbackReason: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export type ShipmentStatusHistoryEvent = {
  id: number;
  previousStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus;
  comment: string | null;
  createdAt: string;
};

export type Shipment = ApiShipment;

export type Carrier = ApiCarrier & {
  status: CarrierStatus;
  assignedShipments: Shipment[];
};

export type CarrierListResponse = Carrier[];

export type CreateCarrierRequest = never;

export type UpdateCarrierRequest = never;

export type UpdateCarrierAvailabilityRequest = {
  simulatedAvailable: boolean;
};

export type AssignCarrierRequest = {
  carrierCode?: string;
  destinationCity?: string;
};

export type CreateShipmentRequest = {
  orderId: number;
  orderNumber: string;
  customerId: number;
  destinationAddress: string;
  destinationCity: string;
};

export type UpdateShipmentStatusRequest = {
  status: ShipmentStatus;
  comment?: string;
};

export type CarrierFilters = {
  query: string;
  status: CarrierStatus | "all";
  serviceType: string;
};

export type CarrierSummary = {
  totalCarriers: number;
  activeCarriers: number;
  inactiveCarriers: number;
  availableCarriers: number;
  unavailableCarriers: number;
  assignedShipments: number;
};

export function getCarrierStatus(carrier: Pick<ApiCarrier, "active" | "simulatedAvailable">): CarrierStatus {
  if (!carrier.active) {
    return "INACTIVE";
  }

  if (!carrier.simulatedAvailable) {
    return "UNAVAILABLE";
  }

  return "ACTIVE";
}

export function getCarrierStatusLabel(status: CarrierStatus): string {
  if (status === "ACTIVE") {
    return "Disponible";
  }

  if (status === "UNAVAILABLE") {
    return "No disponible";
  }

  return "Inactivo";
}

export function getCarrierStatusDescription(status: CarrierStatus): string {
  if (status === "ACTIVE") {
    return "Transportista habilitado para asignacion.";
  }

  if (status === "UNAVAILABLE") {
    return "Transportista activo, pero sin disponibilidad operacional.";
  }

  return "Transportista fuera de operacion.";
}

export function getShipmentStatusLabel(status: ShipmentStatus | string): string {
  const labels: Record<ShipmentStatus, string> = {
    CREATED: "Creado",
    PENDING_ASSIGNMENT: "Pendiente de asignacion",
    ASSIGNED: "Asignado",
    IN_TRANSIT: "En despacho",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    FAILED: "Con incidencia"
  };

  if (isShipmentStatus(status)) {
    return labels[status];
  }

  return status
    .toLocaleLowerCase("es-CL")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1))
    .join(" ");
}

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return SHIPMENT_STATUSES.some((status) => status === value);
}

export function carrierToCarrier(carrier: ApiCarrier, shipments: Shipment[] = []): Carrier {
  return {
    ...carrier,
    status: getCarrierStatus(carrier),
    assignedShipments: shipments.filter((shipment) => shipment.carrier?.id === carrier.id)
  };
}
