import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingPage } from "@/features/streaming/pages/StreamingPage";
import { useMetricsStream } from "@/features/streaming/hooks/useMetricsStream";

vi.mock("@/features/streaming/hooks/useMetricsStream", () => ({
  useMetricsStream: vi.fn()
}));

const mockedHook = vi.mocked(useMetricsStream);

const snapshot = {
  generatedAt: "2026-11-18T10:00:00Z",
  windowSeconds: 60,
  totalEvents: 12,
  totalRevenue: 1500000,
  eventsPerSecond: 2.5,
  ordersInWindow: 7,
  revenueInWindow: 420000,
  averageTicket: 60000,
  topProducts: [{ productName: "Monitor 27''", units: 4, revenue: 759960 }],
  eventsByPartition: { "0": 3, "1": 4 }
};

describe("StreamingPage", () => {
  beforeEach(() => {
    mockedHook.mockReset();
  });

  it("muestra el estado de conexion mientras no llegan metricas", () => {
    mockedHook.mockReturnValue({ snapshot: null, status: "connecting" });

    render(<StreamingPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Conectando");
    expect(screen.getByText(/Esperando métricas/)).toBeInTheDocument();
  });

  it("muestra las tarjetas con las metricas en vivo", () => {
    mockedHook.mockReturnValue({ snapshot, status: "live" });

    render(<StreamingPage />);

    expect(screen.getByRole("status")).toHaveTextContent("En vivo");
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("$420.000")).toBeInTheDocument();
    expect(screen.getByText("$60.000")).toBeInTheDocument();
    expect(screen.getByText("2,5 /s")).toBeInTheDocument();
    expect(screen.getByText("Partición 1")).toBeInTheDocument();
  });

  it("indica reconexion cuando el stream se corta", () => {
    mockedHook.mockReturnValue({ snapshot, status: "reconnecting" });

    render(<StreamingPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Reconectando");
  });
});
