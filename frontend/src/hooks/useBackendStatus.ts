import { useCallback, useEffect, useState } from "react";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";
import type { HealthCheckResponse, SystemServiceHealth } from "@/lib/api/apiTypes";
import { backendStatusApi } from "@/services/backendStatusApi";

export function useBackendStatus() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await backendStatusApi.getHealth();
      setHealth(withFrontendStatus(response));
    } catch (healthError) {
      setHealth(buildUnavailableGatewayHealth());
      setError(getSafeErrorMessage(healthError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    health,
    loading,
    error,
    refresh
  };
}

function withFrontendStatus(response: HealthCheckResponse): HealthCheckResponse {
  const services = response.services ?? [];
  const hasFrontend = services.some((service) => service.key === "frontend");

  return {
    ...response,
    services: hasFrontend ? services : [...services, frontendService()]
  };
}

function buildUnavailableGatewayHealth(): HealthCheckResponse {
  const services: SystemServiceHealth[] = [
    {
      key: "gateway",
      name: "API Gateway",
      status: "DOWN",
      message: "No fue posible conectar con el sistema. Intenta nuevamente en unos minutos."
    },
    frontendService()
  ];

  return {
    status: "DOWN",
    checkedAt: new Date().toISOString(),
    services
  };
}

function frontendService(): SystemServiceHealth {
  return {
    key: "frontend",
    name: "Frontend",
    status: "UP",
    message: "Interfaz disponible."
  };
}
