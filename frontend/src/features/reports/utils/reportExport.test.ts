import { describe, expect, it } from "vitest";
import type { ReportCsvRow, ReportFilters } from "@/features/reports/types/reportTypes";
import { buildReportCsvContent, buildReportFileName, buildReportXlsxData } from "@/features/reports/utils/reportExport";

const rows: ReportCsvRow[] = [
  {
    seccion: "Pedidos",
    registro: "ORD-001",
    nombre: "Pedido principal",
    codigo: "ORD-001",
    estado: "Pendiente",
    fecha: "25-05-2026",
    bodega: "Central",
    stock: "",
    stockMinimo: "",
    cliente: "Cliente Demo",
    total: "125000",
    transportista: "",
    detalle: "Incluye prioridad; revisar"
  },
  {
    seccion: "Inventario",
    registro: "SKU-001",
    nombre: "Notebook \"Pro\"",
    codigo: "SKU-001",
    estado: "Stock bajo",
    fecha: "",
    bodega: "Central",
    stock: "4",
    stockMinimo: "10",
    cliente: "",
    total: "",
    transportista: "",
    detalle: "Reponer"
  }
];

const filters: ReportFilters = {
  dateFrom: "2026-05-01",
  dateTo: "2026-05-25",
  reportType: "general",
  status: "",
  warehouseId: "",
  carrierCode: ""
};

describe("reportExport", () => {
  it("builds an Excel-friendly CSV with semicolon separator and escaped values", () => {
    const content = buildReportCsvContent(rows);

    expect(content).toContain("sep=;");
    expect(content).toContain("Seccion;Registro;Nombre;Codigo");
    expect(content).toContain("\"Incluye prioridad; revisar\"");
    expect(content).toContain("\"Notebook \"\"Pro\"\"\"");
  });

  it("builds a professional XLSX sheet structure with title, metadata and sections", () => {
    const sheet = buildReportXlsxData(rows, filters, new Date("2026-05-25T12:00:00"));

    expect(sheet[0]?.[0]).toMatchObject({ value: "Reporte Operacional SmartLogix" });
    expect(sheet[1]?.[0]).toMatchObject({ value: expect.stringContaining("Fecha de generacion") });
    expect(sheet.flat().some((cell) => typeof cell === "object" && cell !== null && "value" in cell && cell.value === "Pedidos")).toBe(true);
    expect(sheet.flat().some((cell) => typeof cell === "object" && cell !== null && "value" in cell && cell.value === "Inventario")).toBe(true);
  });

  it("uses the expected report file names", () => {
    const date = new Date("2026-05-25T12:00:00");

    expect(buildReportFileName("csv", date)).toBe("smartlogix-reporte-2026-05-25.csv");
    expect(buildReportFileName("xlsx", date)).toBe("smartlogix-reporte-2026-05-25.xlsx");
  });
});

