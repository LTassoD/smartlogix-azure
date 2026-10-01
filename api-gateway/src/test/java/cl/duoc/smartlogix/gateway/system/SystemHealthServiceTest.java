package cl.duoc.smartlogix.gateway.system;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SystemHealthServiceTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void shouldReportDegradedWhenOneServiceIsUnavailable() throws IOException {
        String upServiceUrl = startHealthServer("{\"status\":\"UP\"}");
        SystemHealthService service = newService(upServiceUrl, "http://127.0.0.1:1", upServiceUrl, upServiceUrl);

        SystemHealthResponse response = service.checkHealth();

        assertThat(response.status()).isEqualTo("DEGRADED");
        assertThat(response.services()).anySatisfy(serviceHealth -> {
            assertThat(serviceHealth.key()).isEqualTo("inventory");
            assertThat(serviceHealth.status()).isEqualTo("DOWN");
            assertThat(serviceHealth.message()).contains("Inventario");
        });
        assertThat(response.services()).anySatisfy(serviceHealth -> {
            assertThat(serviceHealth.key()).isEqualTo("orders");
            assertThat(serviceHealth.status()).isEqualTo("UP");
        });
    }

    @Test
    void shouldReportUpWhenEveryServiceIsAvailable() throws IOException {
        String upServiceUrl = startHealthServer("{\"status\":\"UP\"}");
        SystemHealthService service = newService(upServiceUrl, upServiceUrl, upServiceUrl, upServiceUrl);

        SystemHealthResponse response = service.checkHealth();

        assertThat(response.status()).isEqualTo("UP");
        assertThat(response.services()).allSatisfy(serviceHealth -> assertThat(serviceHealth.status()).isEqualTo("UP"));
    }

    private SystemHealthService newService(String identityUrl, String inventoryUrl, String ordersUrl, String shippingUrl) {
        SystemHealthService service = new SystemHealthService();
        ReflectionTestUtils.setField(service, "identityUrl", identityUrl);
        ReflectionTestUtils.setField(service, "inventoryUrl", inventoryUrl);
        ReflectionTestUtils.setField(service, "ordersUrl", ordersUrl);
        ReflectionTestUtils.setField(service, "shippingUrl", shippingUrl);
        return service;
    }

    private String startHealthServer(String body) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/actuator/health", exchange -> {
            byte[] response = body.getBytes();
            exchange.sendResponseHeaders(200, response.length);
            try (OutputStream responseBody = exchange.getResponseBody()) {
                responseBody.write(response);
            }
        });
        server.start();
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }
}

