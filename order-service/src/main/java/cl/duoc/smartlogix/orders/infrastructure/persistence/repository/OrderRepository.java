package cl.duoc.smartlogix.orders.infrastructure.persistence.repository;

import cl.duoc.smartlogix.orders.domain.enums.OrderStatus;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    Optional<OrderEntity> findByOrderNumber(String orderNumber);

    boolean existsByOrderNumber(String orderNumber);

    List<OrderEntity> findByStatus(OrderStatus status);

    List<OrderEntity> findByCustomerId(Long customerId);
}
