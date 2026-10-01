import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { InventoryItem } from "@/features/inventory/types/inventoryTypes";
import { ReportChartCard } from "@/features/reports/components/ReportChartCard";
import { reportChartEmptyMessage } from "@/features/reports/components/reportChartUtils";

type InventoryCriticalChartProps = {
  products: InventoryItem[];
  loading?: boolean;
};

const chartConfig = {
  stock: {
    label: "Stock actual",
    color: "#dc2626"
  }
} satisfies ChartConfig;

export function InventoryCriticalChart({ products, loading = false }: InventoryCriticalChartProps) {
  const chartData = products.slice(0, 8).map((product) => ({
    label: product.name,
    sku: product.sku,
    stock: Math.max(product.totalQuantity, 0),
    fill: product.stockStatus === "out" ? "#dc2626" : "#ca8a04"
  }));
  const axisMax = Math.max(...chartData.map((item) => item.stock), 1);

  return (
    <ReportChartCard
      title="Inventario critico"
      description="Productos con stock bajo o sin stock."
      loading={loading}
      emptyMessage={reportChartEmptyMessage}
    >
      {chartData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-80 min-h-[20rem]">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 12, right: 22, top: 6, bottom: 6 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, axisMax]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={136}
              tick={{ fontSize: 12 }}
              tickFormatter={truncateLabel}
            />
            <ChartTooltip content={<ChartTooltipContent config={chartConfig} />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="stock" radius={[0, 8, 8, 0]} barSize={18}>
              {chartData.map((item) => (
                <Cell key={item.sku} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : null}
    </ReportChartCard>
  );
}

function truncateLabel(value: string): string {
  if (value.length <= 19) {
    return value;
  }

  return `${value.slice(0, 18)}...`;
}
