package cl.duoc.smartlogix.shipping.infrastructure.persistence.repository;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentStatusHistoryEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShipmentStatusHistoryRepository extends JpaRepository<ShipmentStatusHistoryEntity, Long> {

    List<ShipmentStatusHistoryEntity> findByShipmentIdOrderByCreatedAtAsc(Long shipmentId);
}
