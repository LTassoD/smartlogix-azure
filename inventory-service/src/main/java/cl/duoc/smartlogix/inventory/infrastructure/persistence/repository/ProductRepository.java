package cl.duoc.smartlogix.inventory.infrastructure.persistence.repository;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.ProductEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    Optional<ProductEntity> findBySku(String sku);

    boolean existsBySku(String sku);

    List<ProductEntity> findByActiveTrue();
}
