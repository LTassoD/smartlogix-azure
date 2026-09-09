package cl.duoc.smartlogix.identity.infrastructure.persistence.repository;

import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.TwoFactorChallengeEntity;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TwoFactorChallengeRepository extends JpaRepository<TwoFactorChallengeEntity, Long> {

    @Query("select c.user.id from TwoFactorChallengeEntity c where c.tokenHash = :tokenHash")
    Optional<Long> findUserIdByTokenHash(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("delete from TwoFactorChallengeEntity c where c.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from TwoFactorChallengeEntity c where c.tokenHash = :tokenHash")
    Optional<TwoFactorChallengeEntity> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("""
            update TwoFactorChallengeEntity c
               set c.invalidatedAt = :invalidatedAt
             where c.user.id = :userId
               and c.invalidatedAt is null
            """)
    int invalidateActiveByUserId(
            @Param("userId") Long userId,
            @Param("invalidatedAt") Instant invalidatedAt
    );
}
