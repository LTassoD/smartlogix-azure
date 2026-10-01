package cl.duoc.smartlogix.orders.infrastructure.persistence.repository;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {

    Optional<CustomerEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    List<CustomerEntity> findByActiveTrue();
}
