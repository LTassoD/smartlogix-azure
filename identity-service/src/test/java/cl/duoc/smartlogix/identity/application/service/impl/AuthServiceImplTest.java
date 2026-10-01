package cl.duoc.smartlogix.identity.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.identity.config.JwtProperties;
import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
import cl.duoc.smartlogix.identity.domain.exception.TooManyAuthenticationAttemptsException;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.RoleEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import cl.duoc.smartlogix.identity.infrastructure.security.AuthenticationAttemptRateLimiter;
import cl.duoc.smartlogix.identity.infrastructure.security.JwtTokenService;
import cl.duoc.smartlogix.identity.infrastructure.security.PasswordAuthenticationVerifier;
import cl.duoc.smartlogix.identity.presentation.dto.request.LoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.CompleteTwoFactorLoginRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.LoginResponse;
import java.time.Instant;
import java.util.Optional;
import java.util.OptionalLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

class AuthServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordAuthenticationVerifier passwordVerifier = mock(PasswordAuthenticationVerifier.class);
    private final JwtTokenService jwtTokenService = mock(JwtTokenService.class);
    private final TwoFactorChallengeService challengeService = mock(TwoFactorChallengeService.class);
    private final AuthenticationAttemptRateLimiter rateLimiter = mock(AuthenticationAttemptRateLimiter.class);
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setExpirationSeconds(3600);
        TwoFactorProperties twoFactorProperties = new TwoFactorProperties();
        twoFactorProperties.setChallengeExpirationSeconds(300);
        authService = new AuthServiceImpl(
                userRepository,
                passwordVerifier,
                jwtTokenService,
                jwtProperties,
                twoFactorProperties,
                challengeService,
                rateLimiter
        );
    }

    @Test
    void shouldReturnOnlyTemporaryChallengeWhenTwoFactorIsEnabled() {
        UserEntity user = activeUser(true);
        LoginRequest request = loginRequest();
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));
        when(passwordVerifier.matches("CorrectPassword1", "password-hash")).thenReturn(true);
        when(rateLimiter.retryAfterIfBlocked("password:user@example.com")).thenReturn(OptionalLong.empty());
        when(challengeService.issue(7L)).thenReturn(new TwoFactorChallengeService.IssuedChallenge(
                "opaque-temporary-token",
                Instant.parse("2026-01-01T00:05:00Z")
        ));

        LoginResponse response = authService.login(request);

        assertThat(response.isRequiresTwoFactor()).isTrue();
        assertThat(response.getTemporaryToken()).isEqualTo("opaque-temporary-token");
        assertThat(response.getExpiresIn()).isEqualTo(300);
        assertThat(response.getAccessToken()).isNull();
        assertThat(response.getUser()).isNull();
        verify(jwtTokenService, never()).generateToken(user);
        verify(userRepository).findByEmailIgnoreCaseForUpdate("user@example.com");
        verify(userRepository, never()).findByEmailIgnoreCase("user@example.com");
    }

    @Test
    void shouldKeepDirectJwtLoginForAccountsWithoutTwoFactor() {
        UserEntity user = activeUser(false);
        LoginRequest request = loginRequest();
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));
        when(passwordVerifier.matches("CorrectPassword1", "password-hash")).thenReturn(true);
        when(rateLimiter.retryAfterIfBlocked("password:user@example.com")).thenReturn(OptionalLong.empty());
        when(jwtTokenService.generateToken(user)).thenReturn("signed-access-token");

        LoginResponse response = authService.login(request);

        assertThat(response.isRequiresTwoFactor()).isFalse();
        assertThat(response.getAccessToken()).isEqualTo("signed-access-token");
        assertThat(response.getTemporaryToken()).isNull();
        assertThat(response.getExpiresIn()).isEqualTo(3600);
    }

    @Test
    void shouldRejectIncorrectPasswordWithGenericErrorAndNoToken() {
        UserEntity user = activeUser(false);
        LoginRequest request = loginRequest();
        when(userRepository.findByEmailIgnoreCaseForUpdate("user@example.com")).thenReturn(Optional.of(user));
        when(passwordVerifier.matches("CorrectPassword1", "password-hash")).thenReturn(false);
        when(rateLimiter.retryAfterIfBlocked("password:user@example.com")).thenReturn(OptionalLong.empty());
        when(rateLimiter.recordFailure("password:user@example.com")).thenReturn(OptionalLong.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        verify(jwtTokenService, never()).generateToken(user);
        verify(challengeService, never()).issue(7L);
    }

    @Test
    void shouldRejectAlreadyBlockedIdentityBeforeDatabaseAndBcryptWork() {
        LoginRequest request = loginRequest();
        when(rateLimiter.retryAfterIfBlocked("password:user@example.com"))
                .thenReturn(OptionalLong.of(60));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(TooManyAuthenticationAttemptsException.class);

        verify(userRepository, never()).findByEmailIgnoreCaseForUpdate("user@example.com");
        verifyNoInteractions(passwordVerifier);
    }

    @Test
    void shouldIssueJwtOnlyAfterChallengeServiceAcceptsSecondFactor() {
        UserEntity user = activeUser(true);
        CompleteTwoFactorLoginRequest request = new CompleteTwoFactorLoginRequest();
        request.setTemporaryToken("opaque-temporary-token-that-is-long-enough-123");
        request.setCode("123456");
        when(challengeService.verifyAndConsume(request.getTemporaryToken(), "123456")).thenReturn(user);
        when(jwtTokenService.generateToken(user)).thenReturn("signed-access-token");

        LoginResponse response = authService.completeTwoFactorLogin(request);

        assertThat(response.isRequiresTwoFactor()).isFalse();
        assertThat(response.getAccessToken()).isEqualTo("signed-access-token");
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");
        verify(challengeService).verifyAndConsume(request.getTemporaryToken(), "123456");
        verify(jwtTokenService).generateToken(user);
    }

    @Test
    void shouldKeepChallengeConsumptionAndJwtIssuanceInOneOuterTransaction() throws NoSuchMethodException {
        Transactional transactional = AuthServiceImpl.class
                .getMethod("completeTwoFactorLogin", CompleteTwoFactorLoginRequest.class)
                .getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
    }

    private LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail(" User@Example.com ");
        request.setPassword("CorrectPassword1");
        return request;
    }

    private UserEntity activeUser(boolean twoFactorEnabled) {
        return UserEntity.builder()
                .id(7L)
                .email("user@example.com")
                .password("password-hash")
                .fullName("Test User")
                .active(true)
                .twoFactorEnabled(twoFactorEnabled)
                .twoFactorSecretEncrypted(twoFactorEnabled ? "encrypted-secret" : null)
                .role(RoleEntity.builder().id(1L).name(RoleName.OPERATOR).build())
                .build();
    }
}
