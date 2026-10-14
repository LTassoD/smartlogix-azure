package cl.duoc.smartlogix.orders;

import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.CustomerRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderItemRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "smartlogix.seed.enabled=false",
        "smartlogix.jwt.secret=smartlogix-test-jwt-secret-key-with-at-least-32-bytes",
        "smartlogix.servicebus.host=test.servicebus.windows.net",
        "smartlogix.servicebus.policy-name=test-policy",
        "smartlogix.servicebus.policy-key=test-key",
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
                + "org.springframework.boot.jms.autoconfigure.JmsAutoConfiguration"
})
class OrderServiceApplicationTests {

    @MockitoBean
    private JmsTemplate jmsTemplate;

    @MockitoBean
    private CustomerRepository customerRepository;

    @MockitoBean
    private OrderRepository orderRepository;

    @MockitoBean
    private OrderItemRepository orderItemRepository;

    @MockitoBean
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Test
    void contextLoads() {
    }

}
