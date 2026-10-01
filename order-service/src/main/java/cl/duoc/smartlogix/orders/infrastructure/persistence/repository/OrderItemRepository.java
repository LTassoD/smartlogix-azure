package cl.duoc.smartlogix.orders.infrastructure.persistence.repository;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderItemEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItemEntity, Long> {

    List<OrderItemEntity> findByOrderId(Long orderId);
}
