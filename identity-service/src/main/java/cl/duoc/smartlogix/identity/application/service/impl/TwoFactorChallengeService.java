package cl.duoc.smartlogix.identity.application.service.impl;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.OptionalLong;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TwoFactorChallengeService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String INVALID_CHALLENGE_MESSAGE = "El desafío de autenticación no es válido o expiró.";
    private static final String INVALID_CODE_MESSAGE = "Código de autenticación incorrecto o ya utilizado.";

    private final TwoFactorChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final TwoFactorSecretEncryptionService encryptionService;
    private final TotpService totpService;
    private final AuthenticationAttemptRateLimiter rateLimiter;
    private final TwoFactorProperties properties;
    private final Clock clock;

    @Transactional
    public IssuedChallenge issue(Long userId) {
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));
        if (!Boolean.TRUE.equals(user.getActive())
                || !Boolean.TRUE.equals(user.getTwoFactorEnabled())
                || user.getTwoFactorSecretEncrypted() == null) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        Instant now = clock.instant();
        // The user row lock makes this safe against concurrent verification and bounds
        // persistent challenge storage to at most one row per user.
        challengeRepository.deleteAllByUserId(user.getId());

        String rawToken = randomToken();
        Instant expiresAt = now.plusSeconds(properties.getChallengeExpirationSeconds());
        challengeRepository.save(TwoFactorChallengeEntity.builder()
                .user(user)
                .tokenHash(sha256(rawToken))
                .createdAt(now)
                .expiresAt(expiresAt)
                .failedAttempts(0)
                .build());

        return new IssuedChallenge(rawToken, expiresAt);
    }

    @Transactional(noRollbackFor = {
            InvalidTwoFactorChallengeException.class,
            InvalidTwoFactorCodeException.class,
            TooManyAuthenticationAttemptsException.class
    })
    public UserEntity verifyAndConsume(String rawToken, String code) {
        String tokenHash = sha256(rawToken == null ? "" : rawToken);
        Long userId = challengeRepository.findUserIdByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTwoFactorChallengeException(INVALID_CHALLENGE_MESSAGE));

        // Projecting only the id avoids placing a stale challenge entity in the persistence
        // context before this request obtains the stable user-then-challenge lock order.
        UserEntity user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new InvalidTwoFactorChallengeException(INVALID_CHALLENGE_MESSAGE));
        TwoFactorChallengeEntity challenge = challengeRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new InvalidTwoFactorChallengeException(INVALID_CHALLENGE_MESSAGE));

        Instant now = clock.instant();
        String limiterKey = secondFactorLimiterKey(user.getId());
        OptionalLong blocked = rateLimiter.retryAfterIfBlocked(limiterKey);
        if (blocked.isPresent()) {
            throw tooMany(blocked.getAsLong());
        }

        if (challenge.getInvalidatedAt() != null) {
            throw new InvalidTwoFactorChallengeException(INVALID_CHALLENGE_MESSAGE);
        }
        if (!now.isBefore(challenge.getExpiresAt())) {
            challenge.setInvalidatedAt(now);
            throw new InvalidTwoFactorChallengeException(INVALID_CHALLENGE_MESSAGE);
        }
        if (!Boolean.TRUE.equals(user.getActive())
                || !Boolean.TRUE.equals(user.getTwoFactorEnabled())
                || user.getTwoFactorSecretEncrypted() == null) {
            challenge.setInvalidatedAt(now);
            throw new InvalidTwoFactorChallengeException(INVALID_CHALLENGE_MESSAGE);
        }

        String secret = encryptionService.decrypt(user.getTwoFactorSecretEncrypted());
        if (!totpService.verifyAndConsume(user, secret, code)) {
            challenge.setFailedAttempts(challenge.getFailedAttempts() + 1);
            OptionalLong rateLimit = rateLimiter.recordFailure(limiterKey);
            if (challenge.getFailedAttempts() >= properties.getChallengeMaxAttempts() || rateLimit.isPresent()) {
                challenge.setInvalidatedAt(now);
                throw tooMany(rateLimit.orElse(properties.getLoginBlockSeconds()));
            }
            throw new InvalidTwoFactorCodeException(INVALID_CODE_MESSAGE);
        }

        rateLimiter.reset(limiterKey);
        challengeRepository.invalidateActiveByUserId(user.getId(), now);
        return user;
    }

    private TooManyAuthenticationAttemptsException tooMany(long retryAfterSeconds) {
        return new TooManyAuthenticationAttemptsException(
                "Demasiados intentos. Inicia sesión nuevamente más tarde.",
                retryAfterSeconds
        );
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private String secondFactorLimiterKey(Long userId) {
        return "totp:" + userId;
    }

    public record IssuedChallenge(String token, Instant expiresAt) {
    }
}
