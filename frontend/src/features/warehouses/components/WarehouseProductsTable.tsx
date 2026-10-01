import type { ReactNode } from "react";
import type { WarehouseProductStock } from "@/features/warehouses/types/warehouseTypes";
import { cn } from "@/utils/cn";

type WarehouseProductsTableProps = {
  products: WarehouseProductStock[];
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function WarehouseProductsTable({ products }: WarehouseProductsTableProps) {
  if (products.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Sin productos asociados</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Stock</TableHeader>
              <TableHeader>Minimo</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Actualizacion</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {products.map((product) => (
              <tr key={product.stockId} className="hover:bg-slate-50/90">
                <TableCell>
                  <div className="max-w-[240px]">
                    <p className="truncate font-semibold text-slate-950" title={product.productName}>
                      {product.productName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-slate-950">{product.quantity.toLocaleString("es-CL")}</span>
                </TableCell>
                <TableCell>{product.minimumStock.toLocaleString("es-CL")}</TableCell>
                <TableCell>{getStockLabel(product.quantity, product.minimumStock)}</TableCell>
                <TableCell>{formatDate(product.updatedAt)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStockLabel(quantity: number, minimumStock: number): ReactNode {
  if (quantity <= 0) {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-600/20">Sin stock</span>;
  }

  if (minimumStock > 0 && quantity <= minimumStock) {
    return <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800 ring-1 ring-yellow-600/20">Stock bajo</span>;
  }

  return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20">Disponible</span>;
}

function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500", className)}>{children}</th>;
}

function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-sm text-slate-700", className)}>{children}</td>;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No informado";
  }

  return dateFormatter.format(date);
}
