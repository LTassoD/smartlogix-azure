package cl.duoc.smartlogix.identity.application.service.impl;

import cl.duoc.smartlogix.identity.application.service.TwoFactorManagementService;
import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
import cl.duoc.smartlogix.identity.domain.exception.InvalidTwoFactorCodeException;
import cl.duoc.smartlogix.identity.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.identity.domain.exception.TooManyAuthenticationAttemptsException;
import cl.duoc.smartlogix.identity.domain.exception.TwoFactorSetupExpiredException;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.TwoFactorChallengeRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import cl.duoc.smartlogix.identity.infrastructure.security.AuthenticationAttemptRateLimiter;
import cl.duoc.smartlogix.identity.infrastructure.security.PasswordAuthenticationVerifier;
import cl.duoc.smartlogix.identity.infrastructure.security.TotpService;
import cl.duoc.smartlogix.identity.infrastructure.security.TwoFactorSecretEncryptionService;
import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorSetupResponse;
import cl.duoc.smartlogix.identity.presentation.dto.response.TwoFactorStatusResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.OptionalLong;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TwoFactorManagementServiceImpl implements TwoFactorManagementService {

    private static final String INVALID_CODE_MESSAGE = "Código de autenticación incorrecto o ya utilizado.";

    private final UserRepository userRepository;
    private final TwoFactorChallengeRepository challengeRepository;
    private final TwoFactorSecretEncryptionService encryptionService;
    private final TotpService totpService;
    private final AuthenticationAttemptRateLimiter rateLimiter;
    private final PasswordAuthenticationVerifier passwordVerifier;
    private final TwoFactorProperties properties;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public TwoFactorStatusResponse status(String email) {
        UserEntity user = findUser(email);
        LocalDateTime now = nowLocal();
        boolean pending = user.getTwoFactorPendingSecretEncrypted() != null
                && user.getTwoFactorPendingExpiresAt() != null
                && now.isBefore(user.getTwoFactorPendingExpiresAt());
        return new TwoFactorStatusResponse(
                Boolean.TRUE.equals(user.getTwoFactorEnabled()),
                pending,
                pending ? user.getTwoFactorPendingExpiresAt() : null
        );
    }

    @Override
    @Transactional
    public TwoFactorSetupResponse setup(String email) {
        UserEntity user = findLockedUser(email);
        ensureActive(user);
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            throw new BusinessRuleException("2FA ya está habilitado para esta cuenta.");
        }

        String secret = totpService.generateSecret();
        LocalDateTime expiresAt = nowLocal().plusSeconds(properties.getSetupExpirationSeconds());
        user.setTwoFactorPendingSecretEncrypted(encryptionService.encrypt(secret));
        user.setTwoFactorPendingExpiresAt(expiresAt);
        user.setTwoFactorLastUsedCounter(null);

        return new TwoFactorSetupResponse(
                totpService.buildOtpAuthUri(secret, user.getEmail()),
                properties.getSetupExpirationSeconds()
        );
    }

    @Override
    @Transactional(noRollbackFor = TwoFactorSetupExpiredException.class)
    public void verifySetup(String email, String code) {
        UserEntity user = findLockedUser(email);
        ensureActive(user);
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            throw new BusinessRuleException("2FA ya está habilitado para esta cuenta.");
        }
        if (user.getTwoFactorPendingSecretEncrypted() == null
                || user.getTwoFactorPendingExpiresAt() == null
                || !nowLocal().isBefore(user.getTwoFactorPendingExpiresAt())) {
            clearPending(user);
            throw new TwoFactorSetupExpiredException("La configuración 2FA expiró. Genera un nuevo código QR.");
        }

        verifyCodeOrThrow(user, encryptionService.decrypt(user.getTwoFactorPendingSecretEncrypted()), code);
        user.setTwoFactorSecretEncrypted(user.getTwoFactorPendingSecretEncrypted());
        user.setTwoFactorEnabled(true);
        clearPending(user);
    }

    @Override
    @Transactional
    public void disable(String email, String currentPassword) {
        UserEntity user = findLockedUser(email);
        ensureActive(user);
        if (!Boolean.TRUE.equals(user.getTwoFactorEnabled()) || user.getTwoFactorSecretEncrypted() == null) {
            throw new BusinessRuleException("2FA no está habilitado para esta cuenta.");
        }

        String limiterKey = "disable:" + user.getId();
        boolean passwordMatches = passwordVerifier.matches(currentPassword, user.getPassword());
        OptionalLong blocked = rateLimiter.retryAfterIfBlocked(limiterKey);
        if (blocked.isPresent()) {
            throw tooMany(blocked.getAsLong());
        }
        if (!passwordMatches) {
            OptionalLong newlyBlocked = rateLimiter.recordFailure(limiterKey);
            if (newlyBlocked.isPresent()) {
                throw tooMany(newlyBlocked.getAsLong());
            }
            throw new InvalidCredentialsException("Credenciales incorrectas.");
        }

        rateLimiter.reset(limiterKey);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecretEncrypted(null);
        user.setTwoFactorLastUsedCounter(null);
        clearPending(user);
        challengeRepository.invalidateActiveByUserId(user.getId(), clock.instant());
    }

    private void verifyCodeOrThrow(UserEntity user, String secret, String code) {
        String limiterKey = "totp:" + user.getId();
        OptionalLong blocked = rateLimiter.retryAfterIfBlocked(limiterKey);
        if (blocked.isPresent()) {
            throw tooMany(blocked.getAsLong());
        }
        if (!totpService.verifyAndConsume(user, secret, code)) {
            OptionalLong newlyBlocked = rateLimiter.recordFailure(limiterKey);
            if (newlyBlocked.isPresent()) {
                throw tooMany(newlyBlocked.getAsLong());
            }
            throw new InvalidTwoFactorCodeException(INVALID_CODE_MESSAGE);
        }
        rateLimiter.reset(limiterKey);
    }

    private TooManyAuthenticationAttemptsException tooMany(long retryAfterSeconds) {
        return new TooManyAuthenticationAttemptsException(
                "Demasiados intentos. Intenta nuevamente más tarde.",
                retryAfterSeconds
        );
    }

    private UserEntity findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario autenticado no encontrado."));
    }

    private UserEntity findLockedUser(String email) {
        return userRepository.findByEmailIgnoreCaseForUpdate(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario autenticado no encontrado."));
    }

    private void ensureActive(UserEntity user) {
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BusinessRuleException("La cuenta no está activa.");
        }
    }

    private LocalDateTime nowLocal() {
        return LocalDateTime.ofInstant(Instant.now(clock), ZoneOffset.UTC);
    }

    private void clearPending(UserEntity user) {
        user.setTwoFactorPendingSecretEncrypted(null);
        user.setTwoFactorPendingExpiresAt(null);
    }
}
