import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getShipmentStatusLabel, SHIPMENT_STATUSES } from "@/features/carriers/types/carrierTypes";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { reportChartEmptyMessage } from "@/features/reports/components/reportChartUtils";
import type { ReportChartDatum } from "@/features/reports/types/reportTypes";

type ShipmentsStatusChartProps = {
  data: ReportChartDatum[];
  loading?: boolean;
};

const statusColors: Record<string, string> = {
  CREATED: "#ca8a04",
  PENDING_ASSIGNMENT: "#f59e0b",
  ASSIGNED: "#2563eb",
  IN_TRANSIT: "#0891b2",
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626",
  FAILED: "#b91c1c"
};

const chartConfig = {
  value: {
    label: "Envios",
    color: "#0891b2"
  }
} satisfies ChartConfig;

export function ShipmentsStatusChart({ data, loading = false }: ShipmentsStatusChartProps) {
  const valuesByLabel = new Map(data.map((item) => [item.label, item.value]));
  const chartData = SHIPMENT_STATUSES.map((status) => {
    const label = getShipmentStatusLabel(status);

    return {
      label,
      value: valuesByLabel.get(label) ?? 0,
      fill: statusColors[status]
    };
  }).filter((item) => item.value > 0);

  return (
    <ReportChartCard
      title="Envios por estado"
      description="Distribucion de despachos registrados."
      loading={loading}
      emptyMessage={reportChartEmptyMessage}
    >
      {chartData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-72 min-h-[18rem]">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent config={chartConfig} hideLabel />} />
            <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} paddingAngle={2} strokeWidth={3}>
              {chartData.map((item) => (
                <Cell key={item.label} fill={item.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      ) : null}
    </ReportChartCard>
  );
}
