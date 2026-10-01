import type { HealthCheckResponse, SystemServiceHealth, SystemServiceKey } from "@/lib/api/apiTypes";

export type ServiceDependencyKey = "gateway" | "identity" | "inventory" | "orders" | "shipping" | "frontend";

const serviceFallbacks: Record<ServiceDependencyKey, { name: string; message: string }> = {
  gateway: {
    name: "API Gateway",
    message: "No fue posible conectar con SmartLogix. Algunas funciones pueden no cargar temporalmente."
  },
  identity: {
    name: "Identity/Auth",
    message: "El acceso de usuarios no esta disponible temporalmente. Algunas funciones relacionadas pueden no cargar."
  },
  inventory: {
    name: "Inventario",
    message: "El servicio de Inventario no esta disponible temporalmente. Algunas funciones relacionadas pueden no cargar."
  },
  orders: {
    name: "Pedidos",
    message: "El servicio de Pedidos no esta disponible temporalmente. Algunas funciones relacionadas pueden no cargar."
  },
  shipping: {
    name: "Envios",
    message: "El servicio de Envios no esta disponible temporalmente. Algunas funciones relacionadas pueden no cargar."
  },
  frontend: {
    name: "Frontend",
    message: "Interfaz disponible."
  }
};

export function getServiceHealth(health: HealthCheckResponse | null, key: ServiceDependencyKey): SystemServiceHealth {
  const service = health?.services?.find((item) => item.key === key);

  if (service) {
    return service;
  }

  return {
    key,
    name: serviceFallbacks[key].name,
    status: "UNKNOWN",
    message: serviceFallbacks[key].message
  };
}

export function getProblemServices(
  health: HealthCheckResponse | null,
  keys: readonly ServiceDependencyKey[]
): SystemServiceHealth[] {
  if (!health) {
    return [];
  }

  return keys.map((key) => getServiceHealth(health, key)).filter((service) => !isServiceOperational(service));
}

export function isServiceOperational(service: Pick<SystemServiceHealth, "status">): boolean {
  return service.status === "UP";
}

export function getSystemStatusLabel(status: string | null | undefined): string {
  if (status === "UP") {
    return "Sistema operativo";
  }

  if (status === "DEGRADED") {
    return "Sistema con alertas";
  }

  if (status === "DOWN") {
    return "Sistema no disponible";
  }

  return "Verificando";
}

export function getServiceStatusLabel(status: string | null | undefined): string {
  if (status === "UP") {
    return "Operativo";
  }

  if (status === "DEGRADED" || status === "OUT_OF_SERVICE") {
    return "Degradado";
  }

  if (status === "DOWN") {
    return "No disponible";
  }

  return "Sin verificar";
}

export function getStatusTone(status: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  if (status === "UP") {
    return "success";
  }

  if (status === "DEGRADED" || status === "OUT_OF_SERVICE") {
    return "warning";
  }

  if (status === "DOWN") {
    return "danger";
  }

  return "neutral";
}

export function getServiceMessage(service: SystemServiceHealth): string {
  if (isServiceOperational(service)) {
    return "Servicio operativo.";
  }

  const fallback = serviceFallbacks[service.key as ServiceDependencyKey]?.message;

  if (fallback) {
    return fallback;
  }

  return `El servicio de ${service.name} no esta disponible temporalmente. Algunas funciones relacionadas pueden no cargar.`;
}

export function serviceKeyEquals(key: SystemServiceKey, target: ServiceDependencyKey): boolean {
  return key === target;
}
