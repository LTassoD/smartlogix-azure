package cl.duoc.smartlogix.identity.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
import cl.duoc.smartlogix.identity.domain.exception.TwoFactorSetupExpiredException;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.TwoFactorChallengeRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import cl.duoc.smartlogix.identity.infrastructure.security.AuthenticationAttemptRateLimiter;
import cl.duoc.smartlogix.identity.infrastructure.security.PasswordAuthenticationVerifier;
import cl.duoc.smartlogix.identity.infrastructure.security.TotpService;
import cl.duoc.smartlogix.identity.infrastructure.security.TwoFactorSecretEncryptionService;
import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorSetupResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.OptionalLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TwoFactorManagementServiceImplTest {

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    private final UserRepository userRepository = mock(UserRepository.class);
    private final TwoFactorChallengeRepository challengeRepository = mock(TwoFactorChallengeRepository.class);
    private final TwoFactorSecretEncryptionService encryptionService = mock(TwoFactorSecretEncryptionService.class);
    private final TotpService totpService = mock(TotpService.class);
    private final AuthenticationAttemptRateLimiter rateLimiter = mock(AuthenticationAttemptRateLimiter.class);
    private final PasswordAuthenticationVerifier passwordVerifier = mock(PasswordAuthenticationVerifier.class);
    private TwoFactorManagementServiceImpl service;

    @BeforeEach
    void setUp() {
        TwoFactorProperties properties = new TwoFactorProperties();
        properties.setSetupExpirationSeconds(600);
        properties.setLoginBlockSeconds(60);
        service = new TwoFactorManagementServiceImpl(
                userRepository,
                challengeRepository,
                encryptionService,
                totpService,
                rateLimiter,
                passwordVerifier,
                properties,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void shouldNotEnableUntilPendingSetupCodeIsVerified() {
        UserEntity user = disabledUser();
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));
        when(totpService.generateSecret()).thenReturn("base32-secret");
        when(encryptionService.encrypt("base32-secret")).thenReturn("encrypted-pending-secret");
        when(totpService.buildOtpAuthUri("base32-secret", "user@example.com"))
                .thenReturn("otpauth://totp/SmartLogix:user@example.com");

        TwoFactorSetupResponse setup = service.setup("user@example.com");

        assertThat(user.getTwoFactorEnabled()).isFalse();
        assertThat(user.getTwoFactorPendingSecretEncrypted()).isEqualTo("encrypted-pending-secret");
        assertThat(setup.otpauthUri()).startsWith("otpauth://totp/");
        assertThat(setup.expiresInSeconds()).isEqualTo(600);

        when(encryptionService.decrypt("encrypted-pending-secret")).thenReturn("base32-secret");
        when(rateLimiter.retryAfterIfBlocked("totp:12")).thenReturn(OptionalLong.empty());
        when(totpService.verifyAndConsume(user, "base32-secret", "123456")).thenReturn(true);

        service.verifySetup("user@example.com", "123456");

        assertThat(user.getTwoFactorEnabled()).isTrue();
        assertThat(user.getTwoFactorSecretEncrypted()).isEqualTo("encrypted-pending-secret");
        assertThat(user.getTwoFactorPendingSecretEncrypted()).isNull();
        assertThat(user.getTwoFactorPendingExpiresAt()).isNull();
    }

    @Test
    void shouldClearExpiredPendingSetupWithoutEnabling() {
        UserEntity user = disabledUser();
        user.setTwoFactorPendingSecretEncrypted("expired-ciphertext");
        user.setTwoFactorPendingExpiresAt(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.verifySetup("user@example.com", "123456"))
                .isInstanceOf(TwoFactorSetupExpiredException.class);

        assertThat(user.getTwoFactorEnabled()).isFalse();
        assertThat(user.getTwoFactorPendingSecretEncrypted()).isNull();
        assertThat(user.getTwoFactorPendingExpiresAt()).isNull();
    }

    @Test
    void shouldDisableWithCurrentPasswordAndClearAllTwoFactorState() {
        UserEntity user = enabledUser();
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));
        when(passwordVerifier.matches("CorrectPassword1", "password-hash")).thenReturn(true);
        when(rateLimiter.retryAfterIfBlocked("disable:12")).thenReturn(OptionalLong.empty());

        service.disable("user@example.com", "CorrectPassword1");

        assertThat(user.getTwoFactorEnabled()).isFalse();
        assertThat(user.getTwoFactorSecretEncrypted()).isNull();
        assertThat(user.getTwoFactorLastUsedCounter()).isNull();
        verify(rateLimiter).reset("disable:12");
        verify(challengeRepository).invalidateActiveByUserId(12L, NOW);
    }

    @Test
    void shouldRejectWrongCurrentPasswordWithFrontendCompatibleGenericMessage() {
        UserEntity user = enabledUser();
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));
        when(passwordVerifier.matches("WrongPassword1", "password-hash")).thenReturn(false);
        when(rateLimiter.retryAfterIfBlocked("disable:12")).thenReturn(OptionalLong.empty());
        when(rateLimiter.recordFailure("disable:12")).thenReturn(OptionalLong.empty());

        assertThatThrownBy(() -> service.disable("user@example.com", "WrongPassword1"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Credenciales incorrectas.");

        assertThat(user.getTwoFactorEnabled()).isTrue();
        verify(challengeRepository, never()).invalidateActiveByUserId(12L, NOW);
    }

    private UserEntity disabledUser() {
        return UserEntity.builder()
                .id(12L)
                .email("user@example.com")
                .password("password-hash")
                .active(true)
                .twoFactorEnabled(false)
                .build();
    }

    private UserEntity enabledUser() {
        return UserEntity.builder()
                .id(12L)
                .email("user@example.com")
                .password("password-hash")
                .active(true)
                .twoFactorEnabled(true)
                .twoFactorSecretEncrypted("encrypted-active-secret")
                .twoFactorLastUsedCounter(99L)
                .build();
    }
}
