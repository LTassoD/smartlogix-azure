package cl.duoc.smartlogix.shipping;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.CarrierRepository;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.ShipmentRepository;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.repository.ShipmentStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "smartlogix.seed.enabled=false",
        "smartlogix.jwt.secret=smartlogix-test-jwt-secret-key-with-at-least-32-bytes",
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
                + "org.springframework.boot.amqp.autoconfigure.RabbitAutoConfiguration"
})
class ShippingServiceApplicationTests {

    @MockitoBean
    private CarrierRepository carrierRepository;

    @MockitoBean
    private ShipmentRepository shipmentRepository;

    @MockitoBean
    private ShipmentStatusHistoryRepository shipmentStatusHistoryRepository;

    @Test
    void contextLoads() {
    }

}
