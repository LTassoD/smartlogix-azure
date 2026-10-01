package cl.duoc.smartlogix.orders.infrastructure.persistence.repository;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderStatusHistoryEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistoryEntity, Long> {

    List<OrderStatusHistoryEntity> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
