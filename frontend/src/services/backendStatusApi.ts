import { parseHealthCheckResponse } from "@/lib/api/apiSchemas";
import type { HealthCheckResponse } from "@/lib/api/apiTypes";
import { httpClient } from "@/lib/api/httpClient";

export const backendStatusApi = {
  getHealth(): Promise<HealthCheckResponse> {
    return httpClient.get<HealthCheckResponse>("/api/system/health", {
      auth: false,
      parse: parseHealthCheckResponse
    });
  }
};
