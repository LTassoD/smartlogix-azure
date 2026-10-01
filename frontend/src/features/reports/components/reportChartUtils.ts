import type { ReportChartDatum } from "@/features/reports/types/reportTypes";

export const reportChartEmptyMessage = "No hay información disponible para este reporte.";

export const reportChartToneColors: Record<NonNullable<ReportChartDatum["tone"]>, string> = {
  slate: "#64748b",
  blue: "#2563eb",
  cyan: "#0891b2",
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626"
};
