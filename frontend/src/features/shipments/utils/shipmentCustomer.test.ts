import { describe, expect, it } from "vitest";
import {
  enrichShipmentCustomerNames,
  getShipmentCustomerDisplayName,
  readShipmentCustomerName,
  UNKNOWN_SHIPMENT_CUSTOMER_NAME
} from "@/features/shipments/utils/shipmentCustomer";

describe("shipmentCustomer", () => {
  it("does not expose generated customer labels", () => {
    expect(getShipmentCustomerDisplayName({ customerName: "Cliente 1" })).toBe(UNKNOWN_SHIPMENT_CUSTOMER_NAME);
    expect(readShipmentCustomerName({ customerName: "Cliente 99" })).toBe(UNKNOWN_SHIPMENT_CUSTOMER_NAME);
  });

  it("uses real order customer names when enriching shipments", () => {
    const shipments = [
      {
        orderId: 10,
        orderNumber: "ORD-10",
        customerName: "Cliente 1"
      }
    ];
    const orders = [
      {
        id: 10,
        orderNumber: "ORD-10",
        customer: {
          fullName: "Maria Gonzalez"
        }
      }
    ];

    expect(enrichShipmentCustomerNames(shipments, orders)[0].customerName).toBe("Maria Gonzalez");
  });

  it("falls back to a friendly value when customer is missing", () => {
    expect(readShipmentCustomerName({ customer: { fullName: " " } })).toBe(UNKNOWN_SHIPMENT_CUSTOMER_NAME);
  });
});

