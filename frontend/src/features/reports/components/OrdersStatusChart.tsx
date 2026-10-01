import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/features/orders/types/orderTypes";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { reportChartEmptyMessage } from "@/features/reports/components/reportChartUtils";
import type { ReportChartDatum } from "@/features/reports/types/reportTypes";

type OrdersStatusChartProps = {
  data: ReportChartDatum[];
  loading?: boolean;
};

const statusColors: Record<string, string> = {
  CREATED: "#ca8a04",
  CONFIRMED: "#2563eb",
  PREPARING: "#7c3aed",
  READY_FOR_SHIPPING: "#0891b2",
  SHIPPED: "#0e7490",
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626"
};

const chartConfig = {
  value: {
    label: "Pedidos",
    color: "#2563eb"
  }
} satisfies ChartConfig;

export function OrdersStatusChart({ data, loading = false }: OrdersStatusChartProps) {
  const valuesByLabel = new Map(data.map((item) => [item.label, item.value]));
  const chartData = ORDER_STATUSES.map((status) => {
    const label = ORDER_STATUS_LABELS[status];

    return {
      label,
      value: valuesByLabel.get(label) ?? 0,
      fill: statusColors[status]
    };
  });
  const hasData = chartData.some((item) => item.value > 0);

  return (
    <ReportChartCard
      title="Pedidos por estado"
      description="Distribucion de pedidos segun su estado actual."
      loading={loading}
      emptyMessage={reportChartEmptyMessage}
    >
      {hasData ? (
        <ChartContainer config={chartConfig} className="h-72 min-h-[18rem]">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 12, right: 18, top: 6, bottom: 6 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={132}
              tick={{ fontSize: 12 }}
              tickFormatter={truncateLabel}
            />
            <ChartTooltip content={<ChartTooltipContent config={chartConfig} />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
              {chartData.map((item) => (
                <Cell key={item.label} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : null}
    </ReportChartCard>
  );
}

function truncateLabel(value: string): string {
  if (value.length <= 20) {
    return value;
  }

  return `${value.slice(0, 19)}...`;
}
