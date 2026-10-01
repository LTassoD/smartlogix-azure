package cl.duoc.smartlogix.shipping.infrastructure.persistence.repository;

import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShipmentRepository extends JpaRepository<ShipmentEntity, Long> {

    Optional<ShipmentEntity> findByShipmentNumber(String shipmentNumber);

    Optional<ShipmentEntity> findByOrderId(Long orderId);

    boolean existsByShipmentNumber(String shipmentNumber);

    boolean existsByOrderId(Long orderId);

    List<ShipmentEntity> findByStatus(ShipmentStatus status);

    List<ShipmentEntity> findByCustomerId(Long customerId);
}
