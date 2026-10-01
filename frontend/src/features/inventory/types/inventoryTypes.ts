export type ProductResponse = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  unitPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseResponse = {
  id: number;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockResponse = {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  minimumStock: number;
  updatedAt: string;
};

export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT" | "ORDER_OUT";

export type StockMovementResponse = {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  referenceCode: string | null;
  createdAt: string;
};

export type InventoryStockStatus = "available" | "low" | "out" | "inactive";

export type InventoryWarehouseStock = {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  minimumStock: number;
  updatedAt: string;
};

export type InventoryItem = {
  productId: number;
  sku: string;
  name: string;
  description: string | null;
  unitPrice: number;
  active: boolean;
  totalQuantity: number;
  minimumStock: number;
  stockStatus: InventoryStockStatus;
  warehouseStocks: InventoryWarehouseStock[];
  updatedAt: string;
};

export type InventoryListResponse = {
  items: InventoryItem[];
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
};

export type InventoryFilters = {
  query: string;
  stockStatus: InventoryStockStatus | "all";
  warehouseId: string;
  activeOnly: boolean;
};

export type InventorySummary = {
  totalProducts: number;
  availableStock: number;
  lowStock: number;
  outOfStock: number;
};

export type CreateProductRequest = {
  sku: string;
  name: string;
  description?: string;
  unitPrice: number;
};

export type CreateProductWithInitialStockRequest = {
  product: CreateProductRequest;
  stockSetup?: {
    warehouseId: number;
    quantity: number;
    minimumStock: number;
  };
};

export type UpdateProductRequest = {
  sku?: string;
  name?: string;
  description?: string;
  unitPrice?: number;
  active?: boolean;
};

export type UpdateProductWithMinimumStockRequest = {
  product: UpdateProductRequest;
  stockMinimum?: {
    warehouseId: number;
    minimumStock: number;
  };
};

export type CreateStockMovementRequest = {
  productId: number;
  warehouseId: number;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  referenceCode?: string;
};

export type UpdateStockMinimumRequest = {
  minimumStock: number;
};
