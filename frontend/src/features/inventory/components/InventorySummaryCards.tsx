import { AlertTriangle, Boxes, PackageCheck, PackageX } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { InfoCard } from "@/components/ui/InfoCard";
import type { InventorySummary } from "@/features/inventory/types/inventoryTypes";

type InventorySummaryCardsProps = {
  summary: InventorySummary;
  loading: boolean;
};

export function InventorySummaryCards({ summary, loading }: InventorySummaryCardsProps) {
  if (loading) {
    return <CardSkeleton count={4} columns={4} />;
  }

  const cards = [
    {
      title: "Total de productos",
      value: loading ? "..." : summary.totalProducts.toLocaleString("es-CL"),
      supportingText: "Productos registrados.",
      icon: <Boxes className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Stock disponible",
      value: loading ? "..." : summary.availableStock.toLocaleString("es-CL"),
      supportingText: "Unidades disponibles.",
      icon: <PackageCheck className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Stock bajo",
      value: loading ? "..." : summary.lowStock.toLocaleString("es-CL"),
      supportingText: "Productos bajo umbral.",
      icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Sin stock",
      value: loading ? "..." : summary.outOfStock.toLocaleString("es-CL"),
      supportingText: "Productos sin unidades.",
      icon: <PackageX className="h-5 w-5" aria-hidden="true" />
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <InfoCard key={card.title} title={card.title} value={card.value} supportingText={card.supportingText} icon={card.icon} />
      ))}
    </section>
  );
}
