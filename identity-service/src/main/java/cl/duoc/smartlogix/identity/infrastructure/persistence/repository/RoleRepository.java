package cl.duoc.smartlogix.identity.infrastructure.persistence.repository;

import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.RoleEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, Long> {

    Optional<RoleEntity> findByName(RoleName name);

    boolean existsByName(RoleName name);
}
