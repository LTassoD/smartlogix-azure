import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { reportChartEmptyMessage, reportChartToneColors } from "@/features/reports/components/reportChartUtils";
import type { ReportChartDatum } from "@/features/reports/types/reportTypes";

type ReportChartCardProps = {
  title: string;
  description?: string;
  data?: ReportChartDatum[];
  children?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
};

const chartConfig = {
  value: {
    label: "Registros",
    color: "#2563eb"
  }
} satisfies ChartConfig;

export function ReportChartCard({
  children,
  data = [],
  description,
  emptyMessage = reportChartEmptyMessage,
  footer,
  loading = false,
  title
}: ReportChartCardProps) {
  if (loading) {
    return <ChartSkeleton className="animate-fade-up" />;
  }

  const hasChildren = Boolean(children);
  const hasData = data.length > 0 && data.some((item) => item.value > 0);

  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>

      <div className="mt-5 min-w-0">
        {hasChildren ? (
          children
        ) : hasData ? (
          <CompactBarChart data={data} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{emptyMessage}</div>
        )}
      </div>

      {footer ? <div className="mt-5 border-t border-slate-100 pt-4">{footer}</div> : null}
    </section>
  );
}

function CompactBarChart({ data }: { data: ReportChartDatum[] }) {
  const chartData = data
    .filter((item) => item.value > 0)
    .slice(0, 8)
    .map((item) => ({
      label: item.label,
      helper: item.helper,
      value: item.value,
      fill: reportChartToneColors[item.tone ?? "slate"]
    }));

  return (
    <ChartContainer config={chartConfig} className="h-64 min-h-[16rem]">
      <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 12, right: 18, top: 6, bottom: 6 }}>
        <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={128}
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
  );
}

function truncateLabel(value: string): string {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 17)}...`;
}
