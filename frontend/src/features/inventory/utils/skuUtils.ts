import type { InventoryItem } from "@/features/inventory/types/inventoryTypes";

export function generateSkuFromName(name: string, existingSkus: string[] = []): string {
  const baseSku = normalizeNameToSku(name);

  if (!baseSku) {
    return "";
  }

  return generateUniqueSku(baseSku, existingSkus);
}

export function getExistingSkus(items: InventoryItem[], excludedProductId?: number): string[] {
  return items.filter((item) => item.productId !== excludedProductId).map((item) => item.sku);
}

function normalizeNameToSku(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("es-CL")
    .replace(/[^A-Z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((part) => part.length > 1)
    .slice(0, 2)
    .join("-");
}

function generateUniqueSku(baseSku: string, existingSkus: string[]): string {
  const normalizedExistingSkus = new Set(existingSkus.map((sku) => sku.toLocaleUpperCase("es-CL")));

  if (!normalizedExistingSkus.has(baseSku)) {
    return baseSku;
  }

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${baseSku}-${String(index).padStart(3, "0")}`;

    if (!normalizedExistingSkus.has(candidate)) {
      return candidate;
    }
  }

  return `${baseSku}-${Date.now().toString().slice(-4)}`;
}
