package cl.duoc.smartlogix.identity.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.domain.exception.InvalidTwoFactorChallengeException;
import cl.duoc.smartlogix.identity.domain.exception.InvalidTwoFactorCodeException;
import cl.duoc.smartlogix.identity.domain.exception.TooManyAuthenticationAttemptsException;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.TwoFactorChallengeEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.TwoFactorChallengeRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import cl.duoc.smartlogix.identity.infrastructure.security.AuthenticationAttemptRateLimiter;
import cl.duoc.smartlogix.identity.infrastructure.security.TotpService;
import cl.duoc.smartlogix.identity.infrastructure.security.TwoFactorSecretEncryptionService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.OptionalLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TwoFactorChallengeServiceTest {

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    private final TwoFactorChallengeRepository challengeRepository = mock(TwoFactorChallengeRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final TwoFactorSecretEncryptionService encryptionService = mock(TwoFactorSecretEncryptionService.class);
    private final TotpService totpService = mock(TotpService.class);
    private final AuthenticationAttemptRateLimiter rateLimiter = mock(AuthenticationAttemptRateLimiter.class);
    private final TwoFactorProperties properties = new TwoFactorProperties();
    private TwoFactorChallengeService service;

    @BeforeEach
    void setUp() {
        properties.setChallengeExpirationSeconds(300);
        properties.setChallengeMaxAttempts(5);
        properties.setLoginBlockSeconds(60);
        service = new TwoFactorChallengeService(
                challengeRepository,
                userRepository,
                encryptionService,
                totpService,
                rateLimiter,
                properties,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void shouldPersistOnlySha256OfRandom256BitChallenge() {
        UserEntity user = enabledUser();
        when(userRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(user));
        when(challengeRepository.save(any(TwoFactorChallengeEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TwoFactorChallengeService.IssuedChallenge issued = service.issue(21L);

        ArgumentCaptor<TwoFactorChallengeEntity> captor = ArgumentCaptor.forClass(TwoFactorChallengeEntity.class);
        verify(challengeRepository).save(captor.capture());
        TwoFactorChallengeEntity persisted = captor.getValue();
        assertThat(issued.token()).hasSize(43);
        assertThat(persisted.getTokenHash()).hasSize(64).doesNotContain(issued.token());
        assertThat(persisted.getExpiresAt()).isEqualTo(NOW.plusSeconds(300));
        assertThat(persisted.getFailedAttempts()).isZero();
        verify(challengeRepository).deleteAllByUserId(21L);
    }

    @Test
    void shouldConsumeValidChallengeAndReturnItsUser() {
        UserEntity user = enabledUser();
        TwoFactorChallengeEntity challenge = activeChallenge(user);
        stubChallengeLookup(user, challenge);
        when(encryptionService.decrypt("encrypted-secret")).thenReturn("base32-secret");
        when(totpService.verifyAndConsume(user, "base32-secret", "123456")).thenReturn(true);

        UserEntity result = service.verifyAndConsume("opaque-token", "123456");

        assertThat(result).isSameAs(user);
        verify(rateLimiter).reset("totp:21");
        verify(challengeRepository).invalidateActiveByUserId(21L, NOW);
    }

    @Test
    void shouldRejectIncorrectCodeAndIncrementChallengeAttempts() {
        UserEntity user = enabledUser();
        TwoFactorChallengeEntity challenge = activeChallenge(user);
        stubChallengeLookup(user, challenge);
        when(encryptionService.decrypt("encrypted-secret")).thenReturn("base32-secret");
        when(totpService.verifyAndConsume(user, "base32-secret", "000000")).thenReturn(false);
        when(rateLimiter.recordFailure("totp:21")).thenReturn(OptionalLong.empty());

        assertThatThrownBy(() -> service.verifyAndConsume("opaque-token", "000000"))
                .isInstanceOf(InvalidTwoFactorCodeException.class);

        assertThat(challenge.getFailedAttempts()).isEqualTo(1);
        assertThat(challenge.getInvalidatedAt()).isNull();
        verify(challengeRepository, never()).invalidateActiveByUserId(21L, NOW);
    }

    @Test
    void shouldInvalidateAndRejectExpiredChallenge() {
        UserEntity user = enabledUser();
        TwoFactorChallengeEntity challenge = activeChallenge(user);
        challenge.setExpiresAt(NOW);
        stubChallengeLookup(user, challenge);

        assertThatThrownBy(() -> service.verifyAndConsume("opaque-token", "123456"))
                .isInstanceOf(InvalidTwoFactorChallengeException.class);

        assertThat(challenge.getInvalidatedAt()).isEqualTo(NOW);
        verify(encryptionService, never()).decrypt(any());
    }

    @Test
    void shouldRejectUnknownTokenBeforeTrustingAnyUserId() {
        when(challengeRepository.findUserIdByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyAndConsume("unknown-token", "123456"))
                .isInstanceOf(InvalidTwoFactorChallengeException.class);

        verify(userRepository, never()).findByIdForUpdate(anyLong());
        verify(challengeRepository, never()).findByTokenHashForUpdate(any());
    }

    @Test
    void shouldRejectAnAlreadyConsumedChallenge() {
        UserEntity user = enabledUser();
        TwoFactorChallengeEntity challenge = activeChallenge(user);
        challenge.setInvalidatedAt(NOW.minusSeconds(1));
        stubChallengeLookup(user, challenge);

        assertThatThrownBy(() -> service.verifyAndConsume("opaque-token", "123456"))
                .isInstanceOf(InvalidTwoFactorChallengeException.class);

        verify(totpService, never()).verifyAndConsume(any(), any(), any());
    }

    @Test
    void shouldInvalidateAndRateLimitChallengeOnFifthIncorrectCode() {
        UserEntity user = enabledUser();
        TwoFactorChallengeEntity challenge = activeChallenge(user);
        challenge.setFailedAttempts(4);
        stubChallengeLookup(user, challenge);
        when(encryptionService.decrypt("encrypted-secret")).thenReturn("base32-secret");
        when(totpService.verifyAndConsume(user, "base32-secret", "000000")).thenReturn(false);
        when(rateLimiter.recordFailure("totp:21")).thenReturn(OptionalLong.empty());

        assertThatThrownBy(() -> service.verifyAndConsume("opaque-token", "000000"))
                .isInstanceOf(TooManyAuthenticationAttemptsException.class);

        assertThat(challenge.getFailedAttempts()).isEqualTo(5);
        assertThat(challenge.getInvalidatedAt()).isEqualTo(NOW);
    }

    private void stubChallengeLookup(UserEntity user, TwoFactorChallengeEntity challenge) {
        when(challengeRepository.findUserIdByTokenHash(any())).thenReturn(Optional.of(21L));
        when(userRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(user));
        when(challengeRepository.findByTokenHashForUpdate(any())).thenReturn(Optional.of(challenge));
        when(rateLimiter.retryAfterIfBlocked("totp:21")).thenReturn(OptionalLong.empty());
    }

    private UserEntity enabledUser() {
        return UserEntity.builder()
                .id(21L)
                .active(true)
                .twoFactorEnabled(true)
                .twoFactorSecretEncrypted("encrypted-secret")
                .build();
    }

    private TwoFactorChallengeEntity activeChallenge(UserEntity user) {
        return TwoFactorChallengeEntity.builder()
                .id(3L)
                .user(user)
                .tokenHash("stored-hash")
                .createdAt(NOW)
                .expiresAt(NOW.plusSeconds(300))
                .failedAttempts(0)
                .build();
    }
}
