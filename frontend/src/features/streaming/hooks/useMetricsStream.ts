import { useEffect, useState } from "react";
import { env } from "@/config/env";
import { authTokenProvider } from "@/lib/security/authTokenProvider";
import type { MetricsSnapshot, StreamStatus } from "@/features/streaming/types";

export const METRICS_STREAM_PATH = "/api/analytics/stream";

const RECONNECT_DELAY_MS = 2000;

/**
 * Suscribe la pagina al stream SSE del gateway.
 *
 * Se usa fetch y no EventSource porque EventSource no puede enviar la cabecera
 * Authorization: el gateway exige JWT en todo /api/**. Si el stream se corta,
 * se reconecta cada 2 s mientras la pagina siga montada.
 */
export function useMetricsStream(): { snapshot: MetricsSnapshot | null; status: StreamStatus } {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function connect(attempt: number) {
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      try {
        const response = await fetch(`${env.gatewayBaseUrl}${METRICS_STREAM_PATH}`, {
          headers: buildStreamHeaders(),
          signal: controller.signal
        });
        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }
        setStatus("live");
        await readEvents(response.body, (event) => {
          if (event.name === "metrics") {
            try {
              setSnapshot(JSON.parse(event.data) as MetricsSnapshot);
              setStatus("live");
            } catch {
              // Un evento malformado no debe tumbar la pagina: se ignora hasta el siguiente.
            }
          }
        }, controller.signal);
      } catch {
        if (controller.signal.aborted) {
          return;
        }
      }
      if (!controller.signal.aborted) {
        setStatus("reconnecting");
        retryTimer = setTimeout(() => void connect(attempt + 1), RECONNECT_DELAY_MS);
      }
    }

    void connect(0);

    return () => {
      controller.abort();
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  return { snapshot, status };
}

function buildStreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  const token = authTokenProvider.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

type SseEvent = { name: string; data: string };

/** Lee un cuerpo text/event-stream y entrega cada evento completo (bloques separados por linea vacia). */
export async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) {
      return;
    }
    buffer += decoder.decode(value, { stream: true });

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const block = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const event = parseBlock(block);
      if (event) {
        onEvent(event);
      }
      separator = buffer.indexOf("\n\n");
    }
  }
}

function parseBlock(block: string): SseEvent | null {
  let name = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      name = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).replace(/^ /, ""));
    }
  }
  return data.length > 0 ? { name, data: data.join("\n") } : null;
}
