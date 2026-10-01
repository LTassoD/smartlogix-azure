import { createValidationError } from "@/lib/api/apiErrors";
import type { ApiResponse } from "@/lib/api/apiTypes";
import { httpClient } from "@/lib/api/httpClient";
import type {
  CreateProductRequest,
  CreateStockMovementRequest,
  InventoryItem,
  InventoryListResponse,
  ProductResponse,
  StockResponse,
  UpdateProductRequest,
  UpdateStockMinimumRequest,
  WarehouseResponse
} from "@/features/inventory/types/inventoryTypes";

type Parser<T> = (value: unknown) => T;

const PRODUCT_PATH = "/api/inventory/products";
const STOCK_PATH = "/api/inventory/stock";
const WAREHOUSE_PATH = "/api/inventory/warehouses";

export const inventoryApi = {
  async getInventory(): Promise<InventoryListResponse> {
    const [products, warehouses] = await Promise.all([this.getProducts(), this.getWarehouses()]);
    const stockByProduct = await Promise.all(products.map((product) => this.getStockByProduct(product.id)));

    return {
      products,
      warehouses,
      items: products.map((product, index) => normalizeInventoryItem(product, stockByProduct[index] ?? []))
    };
  },

  async getProducts(): Promise<ProductResponse[]> {
    const response = await httpClient.get<ApiResponse<ProductResponse[]>>(PRODUCT_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseProduct), "products response")
    });

    return response.data;
  },

  async getInventoryItemById(productId: number): Promise<InventoryItem> {
    const [product, stock] = await Promise.all([this.getProductById(productId), this.getStockByProduct(productId)]);

    return normalizeInventoryItem(product, stock);
  },

  async getProductById(productId: number): Promise<ProductResponse> {
    const response = await httpClient.get<ApiResponse<ProductResponse>>(`${PRODUCT_PATH}/${productId}`, {
      parse: (value) => parseApiResponse(value, parseProduct, "product detail response")
    });

    return response.data;
  },

  async createProduct(input: CreateProductRequest): Promise<ProductResponse> {
    const response = await httpClient.post<ApiResponse<ProductResponse>>(PRODUCT_PATH, {
      body: input,
      parse: (value) => parseApiResponse(value, parseProduct, "create product response")
    });

    return response.data;
  },

  async updateProduct(productId: number, input: UpdateProductRequest): Promise<ProductResponse> {
    const response = await httpClient.put<ApiResponse<ProductResponse>>(`${PRODUCT_PATH}/${productId}`, {
      body: input,
      parse: (value) => parseApiResponse(value, parseProduct, "update product response")
    });

    return response.data;
  },

  async deactivateProduct(productId: number): Promise<void> {
    await httpClient.patch<ApiResponse<null>>(`${PRODUCT_PATH}/${productId}/deactivate`, {
      parse: (value) => parseApiResponse(value, parseNullable, "deactivate product response")
    });
  },

  async getStockByProduct(productId: number): Promise<StockResponse[]> {
    const response = await httpClient.get<ApiResponse<StockResponse[]>>(`${STOCK_PATH}/product/${productId}`, {
      parse: (value) => parseApiResponse(value, parseArray(parseStock), "stock response")
    });

    return response.data;
  },

  async createStockMovement(input: CreateStockMovementRequest): Promise<unknown> {
    const response = await httpClient.post<ApiResponse<unknown>>(`${STOCK_PATH}/movements`, {
      body: input,
      parse: (value) => parseApiResponse(value, isRecord, "stock movement response")
    });

    return response.data;
  },

  async updateMinimumStock(productId: number, warehouseId: number, input: UpdateStockMinimumRequest): Promise<StockResponse> {
    const response = await httpClient.put<ApiResponse<StockResponse>>(
      `${STOCK_PATH}/product/${productId}/warehouse/${warehouseId}/minimum-stock`,
      {
        body: input,
        parse: (value) => parseApiResponse(value, parseStock, "minimum stock response")
      }
    );

    return response.data;
  },

  async getWarehouses(): Promise<WarehouseResponse[]> {
    const response = await httpClient.get<ApiResponse<WarehouseResponse[]>>(WAREHOUSE_PATH, {
      parse: (value) => parseApiResponse(value, parseArray(parseWarehouse), "warehouses response")
    });

    return response.data;
  }
};

function normalizeInventoryItem(product: ProductResponse, stockRows: StockResponse[]): InventoryItem {
  const warehouseStocks = stockRows.map((stock) => ({
    id: stock.id,
    warehouseId: stock.warehouseId,
    warehouseCode: stock.warehouseCode,
    warehouseName: stock.warehouseName,
    quantity: stock.quantity,
    minimumStock: stock.minimumStock,
    updatedAt: stock.updatedAt
  }));
  const totalQuantity = warehouseStocks.reduce((total, stock) => total + stock.quantity, 0);
  const minimumStock = warehouseStocks.reduce((total, stock) => total + stock.minimumStock, 0);
  const latestStockDate = warehouseStocks.reduce((latest, stock) => getLatestIsoDate(latest, stock.updatedAt), product.updatedAt);

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    unitPrice: product.unitPrice,
    active: product.active,
    totalQuantity,
    minimumStock,
    stockStatus: getStockStatus(product.active, totalQuantity, warehouseStocks),
    warehouseStocks,
    updatedAt: latestStockDate
  };
}

function getStockStatus(active: boolean, totalQuantity: number, stockRows: Array<{ quantity: number; minimumStock: number }>) {
  if (!active) {
    return "inactive";
  }

  if (totalQuantity <= 0) {
    return "out";
  }

  if (stockRows.some((stock) => stock.minimumStock > 0 && stock.quantity <= stock.minimumStock)) {
    return "low";
  }

  return "available";
}

function getLatestIsoDate(current: string, candidate: string): string {
  const currentTime = Date.parse(current);
  const candidateTime = Date.parse(candidate);

  if (Number.isNaN(candidateTime)) {
    return current;
  }

  if (Number.isNaN(currentTime) || candidateTime > currentTime) {
    return candidate;
  }

  return current;
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

function parseNullable(value: unknown): null {
  if (value === null || value === undefined) {
    return null;
  }

  throw createValidationError("empty response expected", value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
