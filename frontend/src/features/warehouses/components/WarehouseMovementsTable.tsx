import type { ReactNode } from "react";
import type { WarehouseMovement } from "@/features/warehouses/types/warehouseTypes";
import { cn } from "@/utils/cn";

type WarehouseMovementsTableProps = {
  movements: WarehouseMovement[];
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function WarehouseMovementsTable({ movements }: WarehouseMovementsTableProps) {
  const recentMovements = movements.slice(0, 8);

  if (recentMovements.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Sin registros</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Fecha</TableHeader>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Tipo</TableHeader>
              <TableHeader>Cantidad</TableHeader>
              <TableHeader>Referencia</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {recentMovements.map((movement) => (
              <tr key={movement.id} className="hover:bg-slate-50/90">
                <TableCell>{formatDate(movement.createdAt)}</TableCell>
                <TableCell>
                  <div className="max-w-[220px]">
                    <p className="truncate font-semibold text-slate-950" title={movement.productName}>
                      {movement.productName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{movement.sku}</p>
                  </div>
                </TableCell>
                <TableCell>{getMovementLabel(movement.type)}</TableCell>
                <TableCell>
                  <span className="font-semibold text-slate-950">{movement.quantity.toLocaleString("es-CL")}</span>
                </TableCell>
                <TableCell>{movement.referenceCode ?? formatReason(movement.reason)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getMovementLabel(type: WarehouseMovement["type"]): ReactNode {
  if (type === "IN") {
    return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20">Ingreso</span>;
  }

  if (type === "OUT" || type === "ORDER_OUT") {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-600/20">Salida</span>;
  }

  return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20">Ajuste</span>;
}

function formatReason(reason: string | null): string {
  const trimmedReason = reason?.trim();

  if (!trimmedReason) {
    return "Sin referencia";
  }

  const normalizedReason = trimmedReason.toLocaleLowerCase("es-CL");

  if (normalizedReason === "stock inicial") {
    return "Stock inicial";
  }

  if (normalizedReason.includes("pedido")) {
    return "Pedido asociado";
  }

  return "Movimiento registrado";
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
