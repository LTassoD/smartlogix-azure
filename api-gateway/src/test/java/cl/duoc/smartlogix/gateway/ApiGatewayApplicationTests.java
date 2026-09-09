package cl.duoc.smartlogix.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "smartlogix.jwt.secret=smartlogix-test-jwt-secret-key-with-at-least-32-bytes")
class ApiGatewayApplicationTests {

	@Test
	void contextLoads() {
	}

}
