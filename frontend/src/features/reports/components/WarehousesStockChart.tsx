import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { reportChartEmptyMessage } from "@/features/reports/components/reportChartUtils";
import type { ReportChartDatum } from "@/features/reports/types/reportTypes";

type WarehousesStockChartProps = {
  stockByWarehouse: ReportChartDatum[];
  productsByWarehouse?: ReportChartDatum[];
  loading?: boolean;
};

const chartConfig = {
  stock: {
    label: "Stock",
    color: "#2563eb"
  },
  products: {
    label: "Productos",
    color: "#16a34a"
  }
} satisfies ChartConfig;

export function WarehousesStockChart({ loading = false, productsByWarehouse = [], stockByWarehouse }: WarehousesStockChartProps) {
  const productsByLabel = new Map(productsByWarehouse.map((item) => [item.label, item]));
  const labels = new Set([...stockByWarehouse.map((item) => item.label), ...productsByWarehouse.map((item) => item.label)]);
  const chartData = Array.from(labels)
    .map((label) => {
      const stock = stockByWarehouse.find((item) => item.label === label);
      const products = productsByLabel.get(label);

      return {
        label,
        helper: stock?.helper ?? products?.helper,
        stock: stock?.value ?? 0,
        products: products?.value ?? 0
      };
    })
    .filter((item) => item.stock > 0 || item.products > 0)
    .slice(0, 8);

  return (
    <ReportChartCard
      title="Bodegas"
      description="Stock y productos registrados por ubicacion."
      loading={loading}
      emptyMessage={reportChartEmptyMessage}
    >
      {chartData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-80 min-h-[20rem]">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 12, right: 18, top: 6, bottom: 10 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
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
            <ChartLegend content={<ChartLegendContent config={chartConfig} />} />
            <Bar dataKey="stock" fill="var(--color-stock)" radius={[0, 8, 8, 0]} barSize={14} />
            <Bar dataKey="products" fill="var(--color-products)" radius={[0, 8, 8, 0]} barSize={14} />
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
