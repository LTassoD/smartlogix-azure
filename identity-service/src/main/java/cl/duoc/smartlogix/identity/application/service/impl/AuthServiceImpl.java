package cl.duoc.smartlogix.identity.application.service.impl;

import cl.duoc.smartlogix.identity.application.mapper.UserMapper;
import cl.duoc.smartlogix.identity.application.service.AuthService;
import cl.duoc.smartlogix.identity.config.JwtProperties;
import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
import cl.duoc.smartlogix.identity.domain.exception.ResourceNotFoundException;
import cl.duoc.smartlogix.identity.domain.exception.TooManyAuthenticationAttemptsException;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import cl.duoc.smartlogix.identity.infrastructure.security.AuthenticationAttemptRateLimiter;
import cl.duoc.smartlogix.identity.infrastructure.security.JwtTokenService;
import cl.duoc.smartlogix.identity.infrastructure.security.PasswordAuthenticationVerifier;
import cl.duoc.smartlogix.identity.presentation.dto.request.CompleteTwoFactorLoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.LoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.LoginResponse;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
import java.util.Optional;
import java.util.OptionalLong;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordAuthenticationVerifier passwordVerifier;
    private final JwtTokenService jwtTokenService;
    private final JwtProperties jwtProperties;
    private final TwoFactorProperties twoFactorProperties;
    private final TwoFactorChallengeService twoFactorChallengeService;
    private final AuthenticationAttemptRateLimiter rateLimiter;

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        String limiterKey = "password:" + email;
        OptionalLong blocked = rateLimiter.retryAfterIfBlocked(limiterKey);
        if (blocked.isPresent()) {
            throw tooMany(blocked.getAsLong());
        }

        // Lock before reading security-sensitive account state. This linearizes password
        // validation and the 2FA decision with setup/disable/admin mutations.
        Optional<UserEntity> candidate = userRepository.findByEmailIgnoreCaseForUpdate(email);
        // Recheck after acquiring the row lock: preceding queued attempts may have
        // reached the threshold while this request was waiting.
        blocked = rateLimiter.retryAfterIfBlocked(limiterKey);
        if (blocked.isPresent()) {
            throw tooMany(blocked.getAsLong());
        }

        boolean passwordMatches = passwordVerifier.matches(
                request.getPassword(),
                candidate.map(UserEntity::getPassword).orElse(null)
        );

        // The same lookup and BCrypt work happens for existent and non-existent accounts.
        if (candidate.isEmpty() || !Boolean.TRUE.equals(candidate.get().getActive()) || !passwordMatches) {
            OptionalLong newlyBlocked = rateLimiter.recordFailure(limiterKey);
            if (newlyBlocked.isPresent()) {
                throw tooMany(newlyBlocked.getAsLong());
            }
            throw new InvalidCredentialsException("Invalid email or password");
        }

        UserEntity user = candidate.get();
        rateLimiter.reset(limiterKey);
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            TwoFactorChallengeService.IssuedChallenge challenge = twoFactorChallengeService.issue(user.getId());
            return LoginResponse.builder()
                    .requiresTwoFactor(true)
                    .temporaryToken(challenge.token())
                    .expiresIn(twoFactorProperties.getChallengeExpirationSeconds())
                    .build();
        }

        return authenticatedLoginResponse(user);
    }

    @Override
    @Transactional
    public LoginResponse completeTwoFactorLogin(CompleteTwoFactorLoginRequest request) {
        UserEntity user = twoFactorChallengeService.verifyAndConsume(
                request.getTemporaryToken(),
                request.getCode()
        );
        return authenticatedLoginResponse(user);
    }

    private LoginResponse authenticatedLoginResponse(UserEntity user) {
        return LoginResponse.builder()
                .accessToken(jwtTokenService.generateToken(user))
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getExpirationSeconds())
                .user(UserMapper.toResponse(user))
                .requiresTwoFactor(false)
                .temporaryToken(null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse findAuthenticatedUser(String email) {
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new InvalidCredentialsException("Authentication is no longer valid");
        }
        return UserMapper.toResponse(user);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private TooManyAuthenticationAttemptsException tooMany(long retryAfterSeconds) {
        return new TooManyAuthenticationAttemptsException(
                "Demasiados intentos. Intenta nuevamente más tarde.",
                retryAfterSeconds
        );
    }
}
