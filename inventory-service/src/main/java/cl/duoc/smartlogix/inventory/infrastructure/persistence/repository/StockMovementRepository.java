package cl.duoc.smartlogix.inventory.infrastructure.persistence.repository;

import cl.duoc.smartlogix.inventory.domain.enums.StockMovementType;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockMovementEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovementEntity, Long> {

    List<StockMovementEntity> findByProductId(Long productId);

    List<StockMovementEntity> findByWarehouseId(Long warehouseId);

    boolean existsByReferenceCodeAndProductIdAndWarehouseIdAndType(
            String referenceCode,
            Long productId,
            Long warehouseId,
            StockMovementType type
    );
}
