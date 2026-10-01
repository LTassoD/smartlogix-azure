import { AlertTriangle, CheckCircle2, Clock3, ClipboardList, PackageCheck, WalletCards } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { InfoCard } from "@/components/ui/InfoCard";
import type { OrderSummary } from "@/features/orders/types/orderTypes";

type OrdersSummaryCardsProps = {
  summary: OrderSummary;
  loading: boolean;
};

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

export function OrdersSummaryCards({ summary, loading }: OrdersSummaryCardsProps) {
  if (loading) {
    return <CardSkeleton count={6} columns={4} />;
  }

  const cards = [
    {
      title: "Total de pedidos",
      value: getCountValue(summary.totalOrders, loading),
      supportingText: "Pedidos registrados.",
      icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Pendientes",
      value: getCountValue(summary.pendingOrders, loading),
      supportingText: "Requieren confirmacion.",
      icon: <Clock3 className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Confirmados",
      value: getCountValue(summary.confirmedOrders, loading),
      supportingText: "Listos para preparacion.",
      icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "En proceso",
      value: getCountValue(summary.inProgressOrders, loading),
      supportingText: "Preparacion o despacho.",
      icon: <PackageCheck className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Incidencias",
      value: getCountValue(summary.cancelledOrders, loading),
      supportingText: "Cancelados o detenidos.",
      icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />
    },
    {
      title: "Monto total",
      value: loading ? "..." : summary.totalOrders === 0 ? "Sin registros" : currencyFormatter.format(summary.totalAmount),
      supportingText: "Valor acumulado.",
      icon: <WalletCards className="h-5 w-5" aria-hidden="true" />
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <InfoCard key={card.title} title={card.title} value={card.value} supportingText={card.supportingText} icon={card.icon} />
      ))}
    </section>
  );
}

function getCountValue(value: number, loading: boolean): string {
  if (loading) {
    return "...";
  }

  if (value === 0) {
    return "Sin registros";
  }

  return value.toLocaleString("es-CL");
}
