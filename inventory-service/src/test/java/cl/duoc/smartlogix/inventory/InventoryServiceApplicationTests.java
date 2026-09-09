package cl.duoc.smartlogix.inventory;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.ProductRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockMovementRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.WarehouseRepository;
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
class InventoryServiceApplicationTests {

    @MockitoBean
    private ProductRepository productRepository;

    @MockitoBean
    private WarehouseRepository warehouseRepository;

    @MockitoBean
    private StockRepository stockRepository;

    @MockitoBean
    private StockMovementRepository stockMovementRepository;

    @Test
    void contextLoads() {
    }
}
