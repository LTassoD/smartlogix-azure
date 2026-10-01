import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import type { Order } from "@/features/orders/types/orderTypes";
import { OrdersStatusChart } from "@/features/reports/components/OrdersStatusChart";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { ReportTable, type ReportTableColumn } from "@/features/reports/components/ReportTable";
import type { OrdersReport } from "@/features/reports/types/reportTypes";

type OrdersReportSectionProps = {
  report: OrdersReport;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function OrdersReportSection({ report }: OrdersReportSectionProps) {
  const columns: Array<ReportTableColumn<Order>> = [
    {
      key: "order",
      header: "Pedido",
      render: (order) => <span className="font-semibold text-slate-950">{order.orderNumber}</span>
    },
    {
      key: "customer",
      header: "Cliente",
      render: (order) => (
        <div className="max-w-[240px]">
          <p className="truncate font-semibold text-slate-950" title={order.customer.fullName}>
            {order.customer.fullName}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{order.customer.email}</p>
        </div>
      )
    },
    {
      key: "status",
      header: "Estado",
      render: (order) => <OrderStatusBadge status={order.status} />
    },
    {
      key: "amount",
      header: "Total",
      align: "right",
      render: (order) => formatCurrency(order.totalAmount)
    },
    {
      key: "created",
      header: "Fecha",
      render: (order) => formatDate(order.createdAt)
    }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <OrdersStatusChart data={report.ordersByStatus} />
        <ReportChartCard
          title="Resumen de pedidos"
          description="Indicadores principales del flujo comercial."
          data={[
            { label: "Pedidos totales", value: report.totalOrders, tone: "blue" },
            { label: "Pendientes", value: report.pendingOrders, tone: "yellow" },
            { label: "Confirmados", value: report.confirmedOrders, tone: "green" },
            { label: "Cancelados", value: report.cancelledOrders, tone: "red" }
          ]}
        />
      </div>

      <ReportTable
        title="Ultimos pedidos registrados"
        description="Actividad reciente segun fecha de creacion."
        rows={report.latestOrders}
        columns={columns}
        getRowKey={(order) => order.id}
        emptyMessage="Sin pedidos registrados."
      />
    </section>
  );
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}
