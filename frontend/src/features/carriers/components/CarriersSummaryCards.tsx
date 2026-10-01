import { AlertTriangle, PackageCheck, PauseCircle, RadioTower, Truck, Waypoints } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { InfoCard } from "@/components/ui/InfoCard";
import type { CarrierSummary } from "@/features/carriers/types/carrierTypes";

type CarriersSummaryCardsProps = {
  summary: CarrierSummary;
  loading: boolean;
};

export function CarriersSummaryCards({ summary, loading }: CarriersSummaryCardsProps) {
  if (loading) {
    return <CardSkeleton count={6} columns={4} />;
  }

  const cards = [
    {
      title: "Transportistas",
      value: formatMetric(summary.totalCarriers, loading),
      supportingText: "Proveedores logisticos registrados.",
      icon: Truck
    },
    {
      title: "Activos",
      value: formatMetric(summary.activeCarriers, loading),
      supportingText: "Habilitados para operacion.",
      icon: RadioTower
    },
    {
      title: "Inactivos",
      value: formatMetric(summary.inactiveCarriers, loading),
      supportingText: "Fuera de operacion.",
      icon: PauseCircle
    },
    {
      title: "Disponibles",
      value: formatMetric(summary.availableCarriers, loading),
      supportingText: "Con disponibilidad para asignacion.",
      icon: PackageCheck
    },
    {
      title: "Sin disponibilidad",
      value: formatMetric(summary.unavailableCarriers, loading),
      supportingText: "Requieren revision operacional.",
      icon: AlertTriangle
    },
    {
      title: "Despachos asociados",
      value: formatMetric(summary.assignedShipments, loading),
      supportingText: "Envios vinculados a transportistas.",
      icon: Waypoints
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
