import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";
import type { LegendPayload, TooltipContentProps, TooltipValueType } from "recharts";
import { cn } from "@/utils/cn";

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    color?: string;
  }
>;

type ChartContainerProps = {
  children: ReactElement;
  className?: string;
  config?: ChartConfig;
};

export function ChartContainer({ children, className, config = {} }: ChartContainerProps) {
  const variables = Object.entries(config).reduce<Record<string, string>>((styles, [key, item]) => {
    if (item.color) {
      styles[`--color-${key}`] = item.color;
    }

    return styles;
  }, {});

  return (
    <div
      data-chart="container"
      className={cn("min-h-[240px] w-full text-sm text-slate-700 [&_.recharts-cartesian-axis-tick_text]:fill-slate-500", className)}
      style={variables as CSSProperties}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

type ChartTooltipContentProps = Partial<TooltipContentProps<TooltipValueType, string | number>> & {
  config?: ChartConfig;
  hideLabel?: boolean;
  labelFormatter?: (label: ReactNode) => ReactNode;
};

export function ChartTooltipContent({ active, config = {}, hideLabel = false, label, labelFormatter, payload }: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg shadow-slate-950/10">
      {!hideLabel && label ? (
        <p className="mb-2 border-b border-slate-100 pb-1.5 text-xs font-semibold text-slate-500">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item, index) => {
          const dataKey = typeof item.dataKey === "string" || typeof item.dataKey === "number" ? String(item.dataKey) : undefined;
          const itemConfig = dataKey ? config[dataKey] : undefined;
          const name = itemConfig?.label ?? item.name ?? dataKey ?? "Valor";
          const color = item.color ?? item.fill ?? item.stroke ?? itemConfig?.color ?? "#64748b";

          return (
            <div key={`${dataKey ?? item.name ?? "item"}-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate">{name}</span>
              </span>
              <span className="font-semibold tabular-nums text-slate-950">{formatTooltipValue(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ChartLegendContentProps = {
  payload?: ReadonlyArray<LegendPayload>;
  config?: ChartConfig;
};

export function ChartLegendContent({ config = {}, payload }: ChartLegendContentProps) {
  if (!payload?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2 text-xs text-slate-600">
      {payload.map((item) => {
        const dataKey = typeof item.dataKey === "string" || typeof item.dataKey === "number" ? String(item.dataKey) : undefined;
        const itemConfig = dataKey ? config[dataKey] : undefined;

        return (
          <span key={`${item.value ?? dataKey}`} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? itemConfig?.color ?? "#64748b" }} />
            {itemConfig?.label ?? item.value}
          </span>
        );
      })}
    </div>
  );
}

function formatTooltipValue(value: TooltipValueType | undefined): string {
  if (Array.isArray(value)) {
    return value.map((item) => item.toLocaleString("es-CL")).join(" - ");
  }

  if (typeof value === "number") {
    return value.toLocaleString("es-CL");
  }

  if (typeof value === "string") {
    return value;
  }

  return "0";
}

export const ChartTooltip = Tooltip;
export const ChartLegend = Legend;
