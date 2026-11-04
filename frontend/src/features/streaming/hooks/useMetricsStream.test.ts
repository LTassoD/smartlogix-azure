import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readEvents, useMetricsStream } from "@/features/streaming/hooks/useMetricsStream";

vi.mock("@/lib/security/authTokenProvider", () => ({
  authTokenProvider: { getToken: () => "tok-123" }
}));

const snapshot = {
  generatedAt: "2026-11-18T10:00:00Z",
  windowSeconds: 60,
  totalEvents: 3,
  totalRevenue: 30000,
  eventsPerSecond: 0.3,
  ordersInWindow: 3,
  revenueInWindow: 30000,
  averageTicket: 10000,
  topProducts: [],
  eventsByPartition: { "0": 3 }
};

/** Crea una respuesta SSE cuyo cuerpo emite los fragmentos indicados y luego queda abierto. */
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
    }
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const metricsBlock = `event: metrics\ndata: ${JSON.stringify(snapshot)}\n\n`;

describe("useMetricsStream", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("envia el JWT y pasa a 'live' con la primera foto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([metricsBlock]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useMetricsStream());

    await waitFor(() => expect(result.current.snapshot?.ordersInWindow).toBe(3));
    expect(result.current.status).toBe("live");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/analytics\/stream$/);
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok-123" });
  });

  it("ignora un evento malformado sin romper la pagina", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(sseResponse(["event: metrics\ndata: {no es json\n\n"]))
    );

    const { result } = renderHook(() => useMetricsStream());

    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(result.current.snapshot).toBeNull();
  });

  it("marca 'reconectando' cuando el servidor responde error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));

    const { result } = renderHook(() => useMetricsStream());

    await waitFor(() => expect(result.current.status).toBe("reconnecting"));
  });

  it("cancela la conexion al desmontar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([metricsBlock]));
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useMetricsStream());
    await waitFor(() => expect(result.current.status).toBe("live"));

    const signal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    act(() => unmount());

    expect(signal.aborted).toBe(true);
  });
});

describe("readEvents", () => {
  it("arma eventos aunque lleguen partidos entre fragmentos", async () => {
    const recibidos: Array<{ name: string; data: string }> = [];
    const full = "event: metrics\ndata: {\"a\":1}\n\nevent: metrics\ndata: {\"a\":2}\n\n";
    const cortes = [full.slice(0, 10), full.slice(10, 30), full.slice(30)];
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        cortes.forEach((c) => controller.enqueue(encoder.encode(c)));
        controller.close();
      }
    });

    await readEvents(body, (event) => recibidos.push(event), new AbortController().signal);

    expect(recibidos).toEqual([
      { name: "metrics", data: "{\"a\":1}" },
      { name: "metrics", data: "{\"a\":2}" }
    ]);
  });
});
