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

export type ShipmentCarrier = {
  id: number;
  code: string;
  name: string;
  serviceType: string | null;
  active: boolean;
  simulatedAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentOrder = {
  id: number;
  orderNumber: string;
  customerId: number;
};

export type Shipment = {
  id: number;
  shipmentNumber: string;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  carrier: ShipmentCarrier | null;
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

export type ShipmentHistoryEvent = {
  id: number;
  previousStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus;
  comment: string | null;
  createdAt: string;
};

export type ShipmentFilters = {
  query: string;
  status: ShipmentStatus | "all";
  carrierCode: string;
};

export type ShipmentListResponse = Shipment[];

export type CreateShipmentRequest = {
  orderId: number;
  orderNumber: string;
  customerId: number;
  destinationAddress: string;
  destinationCity: string;
};

export type AssignCarrierRequest = {
  carrierCode?: string;
  destinationCity?: string;
};

export type UpdateShipmentStatusRequest = {
  status: ShipmentStatus;
  comment?: string;
};

export type ShipmentSummary = {
  totalShipments: number;
  pendingShipments: number;
  assignedShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  incidentShipments: number;
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED: "Creado",
  PENDING_ASSIGNMENT: "Pendiente de asignacion",
  ASSIGNED: "Asignado",
  IN_TRANSIT: "En transito",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  FAILED: "Incidencia"
};

export const SHIPMENT_STATUS_DESCRIPTIONS: Record<ShipmentStatus, string> = {
  CREATED: "Envio registrado y pendiente de gestion.",
  PENDING_ASSIGNMENT: "Envio pendiente de asignacion.",
  ASSIGNED: "Envio con transportista asignado.",
  IN_TRANSIT: "Envio en transito.",
  DELIVERED: "Envio entregado.",
  CANCELLED: "Envio cancelado.",
  FAILED: "Envio con incidencia."
};

export const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ["ASSIGNED", "CANCELLED", "FAILED"],
  PENDING_ASSIGNMENT: ["ASSIGNED", "CANCELLED", "FAILED"],
  ASSIGNED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: ["ASSIGNED", "CANCELLED"]
};

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return SHIPMENT_STATUSES.some((status) => status === value);
}

export function getShipmentStatusLabel(status: string): string {
  if (isShipmentStatus(status)) {
    return SHIPMENT_STATUS_LABELS[status];
  }

  return status
    .toLocaleLowerCase("es-CL")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1))
    .join(" ");
}

export function getShipmentNextStatuses(status: ShipmentStatus): ShipmentStatus[] {
  return SHIPMENT_STATUS_TRANSITIONS[status];
}

export function canCancelShipment(status: ShipmentStatus): boolean {
  return status !== "CANCELLED" && status !== "DELIVERED";
}
