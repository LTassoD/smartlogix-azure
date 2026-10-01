package cl.duoc.smartlogix.inventory.config;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.ProductEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.WarehouseEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.ProductRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockRepository;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.WarehouseRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockRepository stockRepository;

    @Bean
    @ConditionalOnProperty(name = "smartlogix.seed.enabled", havingValue = "true", matchIfMissing = true)
    CommandLineRunner seedInventoryData() {
        return args -> {
            ProductEntity notebook = seedProduct("SKU-001", "Notebook Lenovo", "Notebook para operaciones", 650000);
            ProductEntity mouse = seedProduct("SKU-002", "Mouse Logitech", "Mouse optico", 15000);
            ProductEntity keyboard = seedProduct("SKU-003", "Teclado Redragon", "Teclado mecanico", 35000);

            WarehouseEntity santiago = seedWarehouse("BOD-SCL", "Bodega Santiago", "Santiago");
            WarehouseEntity valparaiso = seedWarehouse("BOD-VAP", "Bodega Valparaiso", "Valparaiso");

            seedStock(notebook, santiago, 10);
            seedStock(mouse, santiago, 50);
            seedStock(keyboard, valparaiso, 25);
        };
    }

    private ProductEntity seedProduct(String sku, String name, String description, int price) {
        return productRepository.findBySku(sku)
                .orElseGet(() -> productRepository.save(ProductEntity.builder()
                        .sku(sku)
                        .name(name)
                        .description(description)
                        .unitPrice(BigDecimal.valueOf(price))
                        .active(true)
                        .build()));
    }

    private WarehouseEntity seedWarehouse(String code, String name, String address) {
        return warehouseRepository.findByCode(code)
                .orElseGet(() -> warehouseRepository.save(WarehouseEntity.builder()
                        .code(code)
                        .name(name)
                        .address(address)
                        .active(true)
                        .build()));
    }

    private void seedStock(ProductEntity product, WarehouseEntity warehouse, int quantity) {
        stockRepository.findByProductIdAndWarehouseId(product.getId(), warehouse.getId())
                .orElseGet(() -> stockRepository.save(StockEntity.builder()
                        .product(product)
                        .warehouse(warehouse)
                        .quantity(quantity)
                        .minimumStock(0)
                        .build()));
    }
}
