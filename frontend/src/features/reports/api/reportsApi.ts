import { carriersApi } from "@/features/carriers/api/carriersApi";
import { inventoryApi } from "@/features/inventory/api/inventoryApi";
import { ordersApi } from "@/features/orders/api/ordersApi";
import { warehousesApi } from "@/features/warehouses/api/warehousesApi";
import type { ReportsApiResponse } from "@/features/reports/types/reportTypes";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";

export const reportsApi = {
  async getReportsData(): Promise<ReportsApiResponse> {
    const [inventoryResult, ordersResult, shipmentsResult, carriersResult, movementsResult] = await Promise.allSettled([
      inventoryApi.getInventory(),
      ordersApi.getOrders(),
      carriersApi.getShipments(),
      carriersApi.getCarriers(),
      warehousesApi.getStockMovements()
    ]);

    const errors: string[] = [];

    if (inventoryResult.status === "rejected") {
      errors.push(getSafeErrorMessage(inventoryResult.reason));
    }

    if (ordersResult.status === "rejected") {
      errors.push(getSafeErrorMessage(ordersResult.reason));
    }

    if (shipmentsResult.status === "rejected") {
      errors.push(getSafeErrorMessage(shipmentsResult.reason));
    }

    if (carriersResult.status === "rejected") {
      errors.push(getSafeErrorMessage(carriersResult.reason));
    }

    if (movementsResult.status === "rejected") {
      errors.push(getSafeErrorMessage(movementsResult.reason));
    }

    return {
      inventory: inventoryResult.status === "fulfilled" ? inventoryResult.value : null,
      apiOrders: ordersResult.status === "fulfilled" ? ordersResult.value : [],
      shipments: shipmentsResult.status === "fulfilled" ? shipmentsResult.value : [],
      carriers: carriersResult.status === "fulfilled" ? carriersResult.value : [],
      movements: movementsResult.status === "fulfilled" ? movementsResult.value : [],
      errors
    };
  }
};
