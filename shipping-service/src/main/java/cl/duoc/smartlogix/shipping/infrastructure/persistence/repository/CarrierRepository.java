package cl.duoc.smartlogix.shipping.infrastructure.persistence.repository;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CarrierRepository extends JpaRepository<CarrierEntity, Long> {

    Optional<CarrierEntity> findByCode(String code);

    boolean existsByCode(String code);

    List<CarrierEntity> findByActiveTrue();

    List<CarrierEntity> findByActiveTrueAndSimulatedAvailableTrue();
}
