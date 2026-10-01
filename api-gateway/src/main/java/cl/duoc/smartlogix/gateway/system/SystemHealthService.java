package cl.duoc.smartlogix.gateway.system;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SystemHealthService {

    private static final String UP = "UP";
    private static final String DEGRADED = "DEGRADED";
    private static final String DOWN = "DOWN";
    private static final Duration SERVICE_TIMEOUT = Duration.ofSeconds(2);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(SERVICE_TIMEOUT)
            .build();

    @Value("${smartlogix.services.identity.url}")
    private String identityUrl;

    @Value("${smartlogix.services.inventory.url}")
    private String inventoryUrl;

    @Value("${smartlogix.services.orders.url}")
    private String ordersUrl;

    @Value("${smartlogix.services.shipping.url}")
    private String shippingUrl;

    public SystemHealthResponse checkHealth() {
        List<SystemServiceHealthResponse> services = List.of(
                localGatewayHealth(),
                checkService("identity", "Identity/Auth", identityUrl, "El acceso de usuarios no esta disponible temporalmente."),
                checkService("inventory", "Inventario", inventoryUrl, "El servicio de Inventario no esta disponible temporalmente. Algunas funciones de stock pueden no cargar."),
                checkService("orders", "Pedidos", ordersUrl, "El servicio de Pedidos no esta disponible temporalmente. Algunas funciones de pedidos pueden no cargar."),
                checkService("shipping", "Envios", shippingUrl, "El servicio de Envios no esta disponible temporalmente. Algunas funciones de despacho pueden no cargar.")
        );

        String aggregateStatus = services.stream().allMatch(service -> UP.equals(service.status())) ? UP : DEGRADED;

        return new SystemHealthResponse(aggregateStatus, Instant.now(), services);
    }

    private SystemServiceHealthResponse localGatewayHealth() {
        return new SystemServiceHealthResponse("gateway", "API Gateway", UP, "Servicio operativo.");
    }

    private SystemServiceHealthResponse checkService(String key, String name, String baseUrl, String downMessage) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .GET()
                    .timeout(SERVICE_TIMEOUT)
                    .uri(URI.create(baseUrl + "/actuator/health"))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new SystemServiceHealthResponse(key, name, DOWN, downMessage);
            }

            String status = readActuatorStatus(response.body());

            if (UP.equals(status)) {
                return new SystemServiceHealthResponse(key, name, UP, "Servicio operativo.");
            }

            return new SystemServiceHealthResponse(key, name, DEGRADED, "El servicio responde con disponibilidad parcial.");
        } catch (Exception exception) {
            return new SystemServiceHealthResponse(key, name, DOWN, downMessage);
        }
    }

    private String readActuatorStatus(String body) {
        if (body == null || body.isBlank()) {
            return DOWN;
        }

        String normalizedBody = body.replace(" ", "").replace("\n", "").replace("\r", "");

        if (normalizedBody.contains("\"status\":\"UP\"")) {
            return UP;
        }

        if (normalizedBody.contains("\"status\":\"OUT_OF_SERVICE\"") || normalizedBody.contains("\"status\":\"UNKNOWN\"")) {
            return DEGRADED;
        }

        return DOWN;
    }
}
