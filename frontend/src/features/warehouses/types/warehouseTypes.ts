import type { ProductResponse, StockMovementType, StockResponse, WarehouseResponse } from "@/features/inventory/types/inventoryTypes";

export type WarehouseStatus = "ACTIVE" | "INACTIVE";

export type WarehouseFilters = {
  query: string;
  status: WarehouseStatus | "all";
  location: string;
};

export type WarehouseStockSummary = {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
};

export type WarehouseProductStock = {
  stockId: number;
  productId: number;
  sku: string;
  productName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  minimumStock: number;
  updatedAt: string;
};

export type WarehouseMovement = {
  id: number;
  productId: number;
  sku: string;
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

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string;
  stockSummary: WarehouseStockSummary;
  products: WarehouseProductStock[];
  movements: WarehouseMovement[];
};

export type WarehouseListResponse = Warehouse[];

export type WarehouseDetailResponse = Warehouse;

export type CreateWarehouseRequest = {
  code: string;
  name: string;
  address?: string;
};

export type UpdateWarehouseRequest = never;

export type WarehouseDataResponse = {
  warehouses: Warehouse[];
  productStocks: WarehouseProductStock[];
  movements: WarehouseMovement[];
};

export type WarehouseFormValues = {
  code: string;
  name: string;
  address: string;
};

export type WarehouseSummary = {
  totalWarehouses: number;
  activeWarehouses: number;
  inactiveWarehouses: number;
  associatedProducts: number;
  totalStock: number;
  lowStock: number;
};

export function apiWarehouseToWarehouse(
  warehouse: WarehouseResponse,
  productStocks: WarehouseProductStock[] = [],
  movements: WarehouseMovement[] = []
): Warehouse {
  const warehouseProducts = productStocks.filter((stock) => stock.warehouseId === warehouse.id);
  const warehouseMovements = movements.filter((movement) => movement.warehouseId === warehouse.id);

  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address,
    active: warehouse.active,
    status: warehouse.active ? "ACTIVE" : "INACTIVE",
    createdAt: warehouse.createdAt,
    updatedAt: getLatestWarehouseDate(warehouse.updatedAt, warehouseProducts),
    stockSummary: calculateWarehouseStockSummary(warehouseProducts),
    products: warehouseProducts,
    movements: warehouseMovements
  };
}

export function stockResponseToWarehouseProductStock(stock: StockResponse, products: ProductResponse[]): WarehouseProductStock {
  const product = products.find((candidate) => candidate.id === stock.productId);

  return {
    stockId: stock.id,
    productId: stock.productId,
    sku: stock.productSku || product?.sku || "Sin codigo",
    productName: stock.productName || product?.name || "Producto sin nombre",
    warehouseId: stock.warehouseId,
    warehouseCode: stock.warehouseCode,
    warehouseName: stock.warehouseName,
    quantity: stock.quantity,
    minimumStock: stock.minimumStock,
    updatedAt: stock.updatedAt
  };
}

export function warehouseFormToCreateRequest(values: WarehouseFormValues): CreateWarehouseRequest {
  const address = values.address.trim();

  return {
    code: values.code.trim(),
    name: values.name.trim(),
    ...(address ? { address } : {})
  };
}

export function getWarehouseStatusLabel(status: WarehouseStatus): string {
  return status === "ACTIVE" ? "Activa" : "Inactiva";
}

export function getWarehouseStatusDescription(status: WarehouseStatus): string {
  return status === "ACTIVE" ? "Bodega disponible para operacion." : "Bodega fuera de operacion.";
}

function calculateWarehouseStockSummary(products: WarehouseProductStock[]): WarehouseStockSummary {
  return {
    totalProducts: products.length,
    totalStock: products.reduce((total, stock) => total + Math.max(stock.quantity, 0), 0),
    lowStock: products.filter((stock) => stock.minimumStock > 0 && stock.quantity > 0 && stock.quantity <= stock.minimumStock).length,
    outOfStock: products.filter((stock) => stock.quantity <= 0).length
  };
}

function getLatestWarehouseDate(current: string, products: WarehouseProductStock[]): string {
  return products.reduce((latest, product) => {
    const latestTime = Date.parse(latest);
    const productTime = Date.parse(product.updatedAt);

    if (Number.isNaN(productTime)) {
      return latest;
    }

    if (Number.isNaN(latestTime) || productTime > latestTime) {
      return product.updatedAt;
    }

    return latest;
  }, current);
}
