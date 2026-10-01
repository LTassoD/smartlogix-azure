import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, RadioTower, Truck } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { InfoCard } from "@/components/ui/InfoCard";
import type { ShipmentSummary } from "@/features/shipments/types/shipmentTypes";

type ShipmentsSummaryCardsProps = {
  summary: ShipmentSummary;
  loading: boolean;
};

export function ShipmentsSummaryCards({ loading, summary }: ShipmentsSummaryCardsProps) {
  if (loading) {
    return <CardSkeleton count={6} columns={4} />;
  }

  const cards = [
    {
      title: "Total de envios",
      value: formatMetric(summary.totalShipments, loading),
      supportingText: "Despachos registrados.",
      icon: Truck
    },
    {
      title: "Pendientes",
      value: formatMetric(summary.pendingShipments, loading),
      supportingText: "Sin asignacion completa.",
      icon: Clock3
    },
    {
      title: "Asignados",
      value: formatMetric(summary.assignedShipments, loading),
      supportingText: "Con transportista asignado.",
      icon: PackageCheck
    },
    {
      title: "En transito",
      value: formatMetric(summary.inTransitShipments, loading),
      supportingText: "Despachos en ruta.",
      icon: RadioTower
    },
    {
      title: "Entregados",
      value: formatMetric(summary.deliveredShipments, loading),
      supportingText: "Entregas completadas.",
      icon: CheckCircle2
    },
    {
      title: "Incidencias",
      value: formatMetric(summary.incidentShipments, loading),
      supportingText: "Cancelados o con incidencia.",
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
