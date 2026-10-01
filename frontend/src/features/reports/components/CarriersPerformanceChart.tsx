import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getCarrierStatus } from "@/features/carriers/types/carrierTypes";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { reportChartEmptyMessage, reportChartToneColors } from "@/features/reports/components/reportChartUtils";
import type { CarriersReport } from "@/features/reports/types/reportTypes";

type CarriersPerformanceChartProps = {
  report: CarriersReport;
  loading?: boolean;
};

export function CarriersPerformanceChart({ report, loading = false }: CarriersPerformanceChartProps) {
  const assignedShipments = report.shipmentsByCarrier.filter((item) => item.value > 0);
  const showShipments = assignedShipments.length > 0;
  const chartData = showShipments
    ? assignedShipments.slice(0, 8).map((item) => ({
        label: item.label,
        value: item.value,
        fill: reportChartToneColors[item.tone ?? "blue"]
      }))
    : buildAvailabilityData(report);
  const chartConfig = {
    value: {
      label: showShipments ? "Envios" : "Transportistas",
      color: "#2563eb"
    }
  } satisfies ChartConfig;

  return (
    <ReportChartCard
      title={showShipments ? "Envios por transportista" : "Disponibilidad de transportistas"}
      description={showShipments ? "Despachos asignados segun transportista." : "Estado operacional registrado."}
      loading={loading}
      emptyMessage={reportChartEmptyMessage}
    >
      {chartData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-72 min-h-[18rem]">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 12, right: 18, top: 6, bottom: 6 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={138}
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

function buildAvailabilityData(report: CarriersReport) {
  const availability = report.carriers.reduce(
    (counts, carrier) => {
      const status = getCarrierStatus(carrier);
      counts[status] += 1;
      return counts;
    },
    {
      ACTIVE: 0,
      INACTIVE: 0,
      UNAVAILABLE: 0
    }
  );

  return [
    { label: "Disponibles", value: availability.ACTIVE, fill: "#16a34a" },
    { label: "No disponibles", value: availability.UNAVAILABLE, fill: "#ca8a04" },
    { label: "Inactivos", value: availability.INACTIVE, fill: "#64748b" }
  ].filter((item) => item.value > 0);
}

function truncateLabel(value: string): string {
  if (value.length <= 20) {
    return value;
  }

  return `${value.slice(0, 19)}...`;
}
