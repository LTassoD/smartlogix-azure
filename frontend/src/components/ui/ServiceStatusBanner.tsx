import { SystemServiceAlert } from "@/components/system/SystemServiceAlert";
import type { HealthCheckResponse } from "@/lib/api/apiTypes";
import { getProblemServices, getServiceMessage, type ServiceDependencyKey } from "@/lib/system/systemHealth";

type ServiceStatusBannerProps = {
  health: HealthCheckResponse | null;
  serviceKeys: readonly ServiceDependencyKey[];
  loading?: boolean;
  onRetry?: () => void;
};

export function ServiceStatusBanner({ health, loading = false, onRetry, serviceKeys }: ServiceStatusBannerProps) {
  const problemServices = getProblemServices(health, serviceKeys);

  if (problemServices.length === 0) {
    return null;
  }

  return (
    <section className="grid min-w-0 gap-3" aria-label="Alertas de servicios">
      {problemServices.map((service) => (
        <SystemServiceAlert
          key={service.key}
          serviceName={service.name}
          status={service.status}
          message={getServiceMessage(service)}
          onRetry={onRetry}
          isRetrying={loading}
        />
      ))}
    </section>
  );
}
