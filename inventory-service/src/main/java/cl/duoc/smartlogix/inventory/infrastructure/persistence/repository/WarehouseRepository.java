package cl.duoc.smartlogix.inventory.infrastructure.persistence.repository;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.WarehouseEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarehouseRepository extends JpaRepository<WarehouseEntity, Long> {

    Optional<WarehouseEntity> findByCode(String code);

    boolean existsByCode(String code);

    List<WarehouseEntity> findByActiveTrue();
}
