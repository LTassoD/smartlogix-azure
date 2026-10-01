import { AlertTriangle, Boxes, CheckCircle2, ClipboardList, PackageCheck, RadioTower, Truck, Warehouse } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { InfoCard } from "@/components/ui/InfoCard";
import type { ReportSummary } from "@/features/reports/types/reportTypes";

type ReportsSummaryCardsProps = {
  summary: ReportSummary;
  loading: boolean;
};

export function ReportsSummaryCards({ loading, summary }: ReportsSummaryCardsProps) {
  if (loading) {
    return <CardSkeleton count={8} columns={4} />;
  }

  const cards = [
    {
      title: "Productos registrados",
      value: formatMetric(summary.productsRegistered, loading),
      supportingText: "Catalogo disponible.",
      icon: Boxes
    },
    {
      title: "Pedidos totales",
      value: formatMetric(summary.totalOrders, loading),
      supportingText: "Pedidos registrados.",
      icon: ClipboardList
    },
    {
      title: "Pedidos pendientes",
      value: formatMetric(summary.pendingOrders, loading),
      supportingText: "Requieren gestion.",
      icon: PackageCheck
    },
    {
      title: "Envios en transito",
      value: formatMetric(summary.shipmentsInTransit, loading),
      supportingText: "Despachos en ruta.",
      icon: RadioTower
    },
    {
      title: "Envios entregados",
      value: formatMetric(summary.deliveredShipments, loading),
      supportingText: "Entregas completadas.",
      icon: CheckCircle2
    },
    {
      title: "Incidencias",
      value: formatMetric(summary.incidents, loading),
      supportingText: "Envios cancelados o fallidos.",
      icon: AlertTriangle
    },
    {
      title: "Transportistas activos",
      value: formatMetric(summary.activeCarriers, loading),
      supportingText: "Proveedores habilitados.",
      icon: Truck
    },
    {
      title: "Bodegas activas",
      value: formatMetric(summary.activeWarehouses, loading),
      supportingText: "Ubicaciones operativas.",
      icon: Warehouse
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
