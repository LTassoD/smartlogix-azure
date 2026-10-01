import { AlertTriangle, Boxes, CheckCircle2, PackageSearch, Warehouse, XCircle } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { InfoCard } from "@/components/ui/InfoCard";
import type { WarehouseSummary } from "@/features/warehouses/types/warehouseTypes";

type WarehousesSummaryCardsProps = {
  summary: WarehouseSummary;
  loading: boolean;
};

export function WarehousesSummaryCards({ loading, summary }: WarehousesSummaryCardsProps) {
  if (loading) {
    return <CardSkeleton count={6} columns={4} />;
  }

  const cards = [
    {
      title: "Total de bodegas",
      value: formatMetric(summary.totalWarehouses, loading),
      supportingText: "Ubicaciones registradas.",
      icon: Warehouse
    },
    {
      title: "Activas",
      value: formatMetric(summary.activeWarehouses, loading),
      supportingText: "Disponibles para operacion.",
      icon: CheckCircle2
    },
    {
      title: "Inactivas",
      value: formatMetric(summary.inactiveWarehouses, loading),
      supportingText: "Fuera de operacion.",
      icon: XCircle
    },
    {
      title: "Productos asociados",
      value: formatMetric(summary.associatedProducts, loading),
      supportingText: "Con stock registrado.",
      icon: PackageSearch
    },
    {
      title: "Stock total",
      value: formatMetric(summary.totalStock, loading),
      supportingText: "Unidades distribuidas.",
      icon: Boxes
    },
    {
      title: "Stock bajo",
      value: formatMetric(summary.lowStock, loading),
      supportingText: "Alertas por minimo.",
      icon: AlertTriangle
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <InfoCard
          key={card.title}
          title={card.title}
          value={card.value}
          supportingText={card.supportingText}
          icon={<card.icon className="h-5 w-5" aria-hidden="true" />}
        />
      ))}
    </section>
  );
}

function formatMetric(value: number, loading: boolean): string {
  if (loading) {
    return "...";
  }

  if (value === 0) {
    return "Sin registros";
  }

  return value.toLocaleString("es-CL");
}
