import writeXlsxFile from "write-excel-file/browser";
import type { Cell, SheetData, SheetOptions } from "write-excel-file/browser";
import { REPORT_TYPE_LABELS, type ReportCsvRow, type ReportFilters } from "@/features/reports/types/reportTypes";

type ReportExportColumn = {
  key: keyof ReportCsvRow;
  header: string;
  width: number;
};

const CSV_SEPARATOR = ";";
const FILE_PREFIX = "smartlogix-reporte";

export const REPORT_EXPORT_COLUMNS: ReportExportColumn[] = [
  { key: "seccion", header: "Seccion", width: 18 },
  { key: "registro", header: "Registro", width: 18 },
  { key: "nombre", header: "Nombre", width: 28 },
  { key: "codigo", header: "Codigo", width: 18 },
  { key: "estado", header: "Estado", width: 18 },
  { key: "fecha", header: "Fecha", width: 18 },
  { key: "bodega", header: "Bodega", width: 24 },
  { key: "stock", header: "Stock", width: 12 },
  { key: "stockMinimo", header: "Stock minimo", width: 14 },
  { key: "cliente", header: "Cliente", width: 26 },
  { key: "total", header: "Total", width: 16 },
  { key: "transportista", header: "Transportista", width: 24 },
  { key: "detalle", header: "Detalle", width: 36 }
];

export function buildReportCsvContent(rows: ReportCsvRow[]): string {
  return [
    "sep=;",
    REPORT_EXPORT_COLUMNS.map((column) => column.header).join(CSV_SEPARATOR),
    ...rows.map((row) =>
      REPORT_EXPORT_COLUMNS.map((column) => escapeCsvValue(row[column.key], CSV_SEPARATOR)).join(CSV_SEPARATOR)
    )
  ].join("\r\n");
}

export function exportReportCsv(rows: ReportCsvRow[], generatedAt = new Date()): void {
  const blob = new Blob([`\uFEFF${buildReportCsvContent(rows)}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, buildReportFileName("csv", generatedAt));
}

export async function exportReportXlsx(
  rows: ReportCsvRow[],
  filters: ReportFilters,
  generatedAt = new Date()
): Promise<void> {
  await writeXlsxFile(buildReportXlsxData(rows, filters, generatedAt), {
    sheet: "Reporte SmartLogix",
    columns: buildReportXlsxColumns(),
    showGridLines: false
  }).toFile(buildReportFileName("xlsx", generatedAt));
}

export function buildReportXlsxData(rows: ReportCsvRow[], filters: ReportFilters, generatedAt = new Date()): SheetData {
  const groupedRows = groupRowsBySection(rows);
  const sheet: SheetData = [
    [
      {
        value: "Reporte Operacional SmartLogix",
        type: String,
        fontWeight: "bold",
        fontSize: 18,
        textColor: "1E293B",
        backgroundColor: "EAF1FF",
        align: "left",
        alignVertical: "center",
        height: 28,
        columnSpan: REPORT_EXPORT_COLUMNS.length
      }
    ],
    [metadataCell(`Fecha de generacion: ${formatGeneratedAt(generatedAt)}`)],
    [metadataCell(`Filtros aplicados: ${formatFilters(filters)}`)],
    []
  ];

  groupedRows.forEach(([section, sectionRows], sectionIndex) => {
    if (sectionIndex > 0) {
      sheet.push([]);
    }

    sheet.push([
      {
        value: section,
        type: String,
        fontWeight: "bold",
        fontSize: 13,
        textColor: "0F172A",
        backgroundColor: "F1F5F9",
        borderColor: "CBD5E1",
        borderStyle: "thin",
        height: 22,
        columnSpan: REPORT_EXPORT_COLUMNS.length
      }
    ]);
    sheet.push(REPORT_EXPORT_COLUMNS.map((column) => headerCell(column.header)));
    sectionRows.forEach((row) => {
      sheet.push(REPORT_EXPORT_COLUMNS.map((column) => bodyCell(row[column.key], column.key)));
    });
  });

  return sheet;
}

export function buildReportFileName(extension: "csv" | "xlsx", generatedAt = new Date()): string {
  return `${FILE_PREFIX}-${generatedAt.toISOString().slice(0, 10)}.${extension}`;
}

function buildReportXlsxColumns(): NonNullable<SheetOptions<Blob>["columns"]> {
  return REPORT_EXPORT_COLUMNS.map((column) => ({ width: column.width }));
}

function groupRowsBySection(rows: ReportCsvRow[]): Array<[string, ReportCsvRow[]]> {
  const sections = new Map<string, ReportCsvRow[]>();

  rows.forEach((row) => {
    const section = row.seccion || "Reporte";
    sections.set(section, [...(sections.get(section) ?? []), row]);
  });

  return Array.from(sections.entries());
}

function metadataCell(value: string): Cell {
  return {
    value,
    type: String,
    fontSize: 11,
    textColor: "475569",
    columnSpan: REPORT_EXPORT_COLUMNS.length
  };
}

function headerCell(value: string): Cell {
  return {
    value,
    type: String,
    fontWeight: "bold",
    textColor: "FFFFFF",
    backgroundColor: "1D4ED8",
    borderColor: "93C5FD",
    borderStyle: "thin",
    align: "center",
    alignVertical: "center",
    height: 20
  };
}

function bodyCell(value: string, key: keyof ReportCsvRow): Cell {
  const numericValue = toNumber(value);

  return {
    value: numericValue ?? value,
    type: numericValue === null ? String : Number,
    align: numericValue === null ? "left" : "right",
    alignVertical: "top",
    wrap: true,
    borderColor: "E2E8F0",
    borderStyle: "thin",
    backgroundColor: key === "seccion" ? "F8FAFC" : undefined,
    height: 18
  };
}

function toNumber(value: string): number | null {
  if (!value || /[A-Za-z$]/.test(value)) {
    return null;
  }

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFilters(filters: ReportFilters): string {
  const appliedFilters = [
    filters.reportType !== "general" ? `Tipo: ${REPORT_TYPE_LABELS[filters.reportType]}` : null,
    filters.status ? `Estado: ${formatFilterValue(filters.status)}` : null,
    filters.warehouseId ? `Bodega: ${filters.warehouseId}` : null,
    filters.carrierCode ? `Transportista: ${filters.carrierCode}` : null,
    filters.dateFrom ? `Desde: ${filters.dateFrom}` : null,
    filters.dateTo ? `Hasta: ${filters.dateTo}` : null
  ].filter(Boolean);

  return appliedFilters.length > 0 ? appliedFilters.join(" | ") : "Sin filtros";
}

function formatFilterValue(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatGeneratedAt(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function escapeCsvValue(value: string, separator: string): string {
  if (!value.includes('"') && !value.includes(separator) && !/[\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
