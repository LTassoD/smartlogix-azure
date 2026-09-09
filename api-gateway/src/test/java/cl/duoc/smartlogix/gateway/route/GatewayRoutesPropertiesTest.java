package cl.duoc.smartlogix.gateway.route;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.server.mvc.config.GatewayMvcProperties;

@SpringBootTest(properties = "smartlogix.jwt.secret=smartlogix-test-jwt-secret-key-with-at-least-32-bytes")
class GatewayRoutesPropertiesTest {

    @Autowired
    private GatewayMvcProperties gatewayMvcProperties;

    @Test
    void shouldBindGatewayWebMvcRoutes() {
        assertThat(gatewayMvcProperties.getRoutes()).hasSize(5);

        assertThat(gatewayMvcProperties.getRoutes())
                .extracting("id")
                .containsExactly(
                        "identity-service",
                        "identity-users-service",
                        "inventory-service",
                        "order-service",
                        "shipping-service"
                );

        assertThat(gatewayMvcProperties.getRoutes().getFirst().getUri().toString())
                .isEqualTo(GatewayRoutesInfo.AUTH_URI);

        assertThat(gatewayMvcProperties.getRoutes().get(1).getUri().toString())
                .isEqualTo(GatewayRoutesInfo.AUTH_URI);
    }
}
