package cl.duoc.smartlogix.inventory.infrastructure.persistence.repository;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockRepository extends JpaRepository<StockEntity, Long> {

    Optional<StockEntity> findByProductIdAndWarehouseId(Long productId, Long warehouseId);

    List<StockEntity> findByProductId(Long productId);

    List<StockEntity> findByWarehouseId(Long warehouseId);
}
