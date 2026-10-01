import { createValidationError } from "@/lib/api/apiErrors";
import type { ApiResponse } from "@/lib/api/apiTypes";
import { httpClient } from "@/lib/api/httpClient";
import type { ProductResponse, StockMovementResponse, StockResponse, StockMovementType, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";
import {
  apiWarehouseToWarehouse,
  stockResponseToWarehouseProductStock,
  type CreateWarehouseRequest,
  type Warehouse,
  type WarehouseDataResponse,
  type WarehouseMovement
} from "@/features/warehouses/types/warehouseTypes";

type Parser<T> = (value: unknown) => T;

const PRODUCTS_PATH = "/api/inventory/products";
const STOCK_PATH = "/api/inventory/stock";
const WAREHOUSES_PATH = "/api/inventory/warehouses";

const STOCK_MOVEMENT_TYPES: StockMovementType[] = ["IN", "OUT", "ADJUSTMENT", "ORDER_OUT"];

export const warehousesApi = {
  async getWarehouses(): Promise<WarehouseResponse[]> {
    const response = await httpClient.get<ApiResponse<WarehouseResponse[]>>(WAREHOUSES_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseWarehouse), "warehouses response")
    });

    return response.data;
  },

  async getWarehouseById(id: number): Promise<WarehouseResponse> {
    const response = await httpClient.get<ApiResponse<WarehouseResponse>>(`${WAREHOUSES_PATH}/${id}`, {
      parse: (value) => parseApiResponse(value, parseWarehouse, "warehouse detail response")
    });

    return response.data;
  },

  async createWarehouse(input: CreateWarehouseRequest): Promise<WarehouseResponse> {
    const response = await httpClient.post<ApiResponse<WarehouseResponse>>(WAREHOUSES_PATH, {
      body: input,
      parse: (value) => parseApiResponse(value, parseWarehouse, "create warehouse response")
    });

    return response.data;
  },

  async getProducts(): Promise<ProductResponse[]> {
    const response = await httpClient.get<ApiResponse<ProductResponse[]>>(PRODUCTS_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseProduct), "products response")
    });

    return response.data;
  },

  async getStockByProduct(productId: number): Promise<StockResponse[]> {
    const response = await httpClient.get<ApiResponse<StockResponse[]>>(`${STOCK_PATH}/product/${productId}`, {
      parse: (value) => parseApiResponse(value, parseArray(parseStock), "stock response")
    });

    return response.data;
  },

  async getStockMovements(): Promise<WarehouseMovement[]> {
    const response = await httpClient.get<ApiResponse<StockMovementResponse[]>>(`${STOCK_PATH}/movements`, {
      parse: (value) => parseApiResponse(value, parseArray(parseStockMovement), "stock movements response")
    });

    return response.data.map(stockMovementResponseToWarehouseMovement);
  },

  async getWarehouseData(): Promise<WarehouseDataResponse> {
    const [warehouses, products, movements] = await Promise.all([this.getWarehouses(), this.getProducts(), this.getStockMovements()]);
    const stockByProduct = await Promise.all(products.map((product) => this.getStockByProduct(product.id)));
    const productStocks = stockByProduct.flatMap((stockRows) => stockRows.map((stock) => stockResponseToWarehouseProductStock(stock, products)));

    return {
      warehouses: warehouses.map((warehouse) => apiWarehouseToWarehouse(warehouse, productStocks, movements)),
      productStocks,
      movements
    };
  },

  async getWarehouseDetail(id: number): Promise<Warehouse> {
    const [warehouse, products, movements] = await Promise.all([this.getWarehouseById(id), this.getProducts(), this.getStockMovements()]);
    const stockByProduct = await Promise.all(products.map((product) => this.getStockByProduct(product.id)));
    const productStocks = stockByProduct.flatMap((stockRows) => stockRows.map((stock) => stockResponseToWarehouseProductStock(stock, products)));

    return apiWarehouseToWarehouse(warehouse, productStocks, movements);
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

function parseWarehouse(value: unknown): WarehouseResponse {
  if (!isRecord(value)) {
    throw createValidationError("warehouse must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    code: readString(value, "code"),
    name: readString(value, "name"),
    address: readOptionalString(value, "address"),
    active: readBoolean(value, "active"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt")
  };
}

function parseProduct(value: unknown): ProductResponse {
  if (!isRecord(value)) {
    throw createValidationError("product must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    sku: readString(value, "sku"),
    name: readString(value, "name"),
    description: readOptionalString(value, "description"),
    unitPrice: readNumber(value, "unitPrice"),
    active: readBoolean(value, "active"),
    createdAt: readString(value, "createdAt"),
    updatedAt: readString(value, "updatedAt")
  };
}

function parseStock(value: unknown): StockResponse {
  if (!isRecord(value)) {
    throw createValidationError("stock must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    productId: readNumber(value, "productId"),
    productSku: readString(value, "productSku"),
    productName: readString(value, "productName"),
    warehouseId: readNumber(value, "warehouseId"),
    warehouseCode: readString(value, "warehouseCode"),
    warehouseName: readString(value, "warehouseName"),
    quantity: readNumber(value, "quantity"),
    minimumStock: readNumber(value, "minimumStock"),
    updatedAt: readString(value, "updatedAt")
  };
}

function parseStockMovement(value: unknown): StockMovementResponse {
  if (!isRecord(value)) {
    throw createValidationError("stock movement must be an object", value);
  }

  return {
    id: readNumber(value, "id"),
    productId: readNumber(value, "productId"),
    productSku: readString(value, "productSku"),
    productName: readString(value, "productName"),
    warehouseId: readNumber(value, "warehouseId"),
    warehouseCode: readString(value, "warehouseCode"),
    warehouseName: readString(value, "warehouseName"),
    type: readStockMovementType(value, "type"),
    quantity: readNumber(value, "quantity"),
    reason: readOptionalString(value, "reason"),
    referenceCode: readOptionalString(value, "referenceCode"),
    createdAt: readString(value, "createdAt")
  };
}

function stockMovementResponseToWarehouseMovement(movement: StockMovementResponse): WarehouseMovement {
  return {
    id: movement.id,
    productId: movement.productId,
    sku: movement.productSku,
    productName: movement.productName,
    warehouseId: movement.warehouseId,
    warehouseCode: movement.warehouseCode,
    warehouseName: movement.warehouseName,
    type: movement.type,
    quantity: movement.quantity,
    reason: movement.reason,
    referenceCode: movement.referenceCode,
    createdAt: movement.createdAt
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

function readStockMovementType(record: Record<string, unknown>, key: string): StockMovementType {
  const value = readString(record, key);

  if (!isStockMovementType(value)) {
    throw createValidationError(`${key} must be a valid stock movement type`, record);
  }

  return value;
}

function isStockMovementType(value: string): value is StockMovementType {
  return STOCK_MOVEMENT_TYPES.some((movementType) => movementType === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
