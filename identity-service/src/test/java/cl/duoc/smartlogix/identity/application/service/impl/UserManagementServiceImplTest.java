package cl.duoc.smartlogix.identity.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.identity.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.RoleEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.RoleRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.TwoFactorChallengeRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import cl.duoc.smartlogix.identity.infrastructure.security.AuthenticationAttemptRateLimiter;
import cl.duoc.smartlogix.identity.presentation.dto.request.ChangeOwnPasswordRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.CreateUserRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.ResetUserPasswordRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.UpdateUserRequest;
import cl.duoc.smartlogix.identity.presentation.dto.request.UpdateUserRoleRequest;
import cl.duoc.smartlogix.identity.presentation.dto.response.UserResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceImplTest {

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TwoFactorChallengeRepository challengeRepository;

    @Mock
    private AuthenticationAttemptRateLimiter rateLimiter;

    @Mock
    private Clock clock;

    @InjectMocks
    private UserManagementServiceImpl userManagementService;

    @Test
    void shouldCreateUserWithNormalizedEmailAndEncodedPassword() {
        CreateUserRequest request = createUserRequest(" Nuevo@SmartLogix.cl ", "Strong123", RoleName.OPERATOR);
        RoleEntity role = role(RoleName.OPERATOR);

        when(userRepository.existsByEmailIgnoreCase("nuevo@smartlogix.cl")).thenReturn(false);
        when(roleRepository.findByName(RoleName.OPERATOR)).thenReturn(Optional.of(role));
        when(passwordEncoder.encode("Strong123")).thenReturn("encoded-password");
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });

        UserResponse response = userManagementService.create(request);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getEmail()).isEqualTo("nuevo@smartlogix.cl");
        assertThat(response.getRole()).isEqualTo(RoleName.OPERATOR.name());
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    void shouldRejectDuplicateEmail() {
        CreateUserRequest request = createUserRequest("admin@smartlogix.cl", "Strong123", RoleName.ADMIN);

        when(userRepository.existsByEmailIgnoreCase("admin@smartlogix.cl")).thenReturn(true);

        assertThatThrownBy(() -> userManagementService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("email");
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void shouldRejectWeakPassword() {
        CreateUserRequest request = createUserRequest("user@smartlogix.cl", "simple123", RoleName.VIEWER);

        when(userRepository.existsByEmailIgnoreCase("user@smartlogix.cl")).thenReturn(false);

        assertThatThrownBy(() -> userManagementService.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("contrasena");
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void shouldNotDemoteTheLastActiveAdmin() {
        UserEntity admin = user(1L, "admin@smartlogix.cl", RoleName.ADMIN, true);
        UpdateUserRoleRequest request = new UpdateUserRoleRequest();
        request.setRole(RoleName.OPERATOR);

        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(admin));
        when(userRepository.countByActiveTrueAndRole_Name(RoleName.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> userManagementService.updateRole(1L, request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("administrador activo");
    }

    @Test
    void shouldChangeOwnPasswordWhenCurrentPasswordMatches() {
        UserEntity operator = user(2L, "operador@smartlogix.cl", RoleName.OPERATOR, true);
        operator.setPassword("old-hash");
        ChangeOwnPasswordRequest request = new ChangeOwnPasswordRequest();
        request.setCurrentPassword("OldPass123");
        request.setNewPassword("NewPass123");

        when(userRepository.findByEmailIgnoreCaseForUpdate("operador@smartlogix.cl"))
                .thenReturn(Optional.of(operator));
        when(passwordEncoder.matches("OldPass123", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("NewPass123")).thenReturn("new-hash");
        when(clock.instant()).thenReturn(NOW);

        userManagementService.changeOwnPassword("operador@smartlogix.cl", request);

        assertThat(operator.getPassword()).isEqualTo("new-hash");
        verify(challengeRepository).invalidateActiveByUserId(2L, NOW);
        verify(rateLimiter).reset("password:operador@smartlogix.cl");
    }

    @Test
    void shouldRejectOwnPasswordChangeWhenCurrentPasswordDoesNotMatch() {
        UserEntity operator = user(2L, "operador@smartlogix.cl", RoleName.OPERATOR, true);
        operator.setPassword("old-hash");
        ChangeOwnPasswordRequest request = new ChangeOwnPasswordRequest();
        request.setCurrentPassword("WrongPass123");
        request.setNewPassword("NewPass123");

        when(userRepository.findByEmailIgnoreCaseForUpdate("operador@smartlogix.cl"))
                .thenReturn(Optional.of(operator));
        when(passwordEncoder.matches("WrongPass123", "old-hash")).thenReturn(false);

        assertThatThrownBy(() -> userManagementService.changeOwnPassword("operador@smartlogix.cl", request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessageContaining("actual");
    }

    @Test
    void shouldUseWriteLockWhenUpdatingUserProfile() {
        UserEntity operator = user(2L, "operador@smartlogix.cl", RoleName.OPERATOR, true);
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFullName("Nombre actualizado");
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(operator));

        UserResponse response = userManagementService.update(2L, request, "admin@smartlogix.cl");

        assertThat(response.getFullName()).isEqualTo("Nombre actualizado");
        verify(userRepository).findByIdForUpdate(2L);
        verify(userRepository, never()).findById(2L);
    }

    @Test
    void shouldUseWriteLockWhenResettingPassword() {
        UserEntity operator = user(2L, "operador@smartlogix.cl", RoleName.OPERATOR, true);
        ResetUserPasswordRequest request = new ResetUserPasswordRequest();
        request.setNewPassword("NewPass123");
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(operator));
        when(passwordEncoder.encode("NewPass123")).thenReturn("new-hash");
        when(clock.instant()).thenReturn(NOW);

        userManagementService.resetPassword(2L, request);

        assertThat(operator.getPassword()).isEqualTo("new-hash");
        verify(userRepository).findByIdForUpdate(2L);
        verify(userRepository, never()).findById(2L);
        verify(challengeRepository).invalidateActiveByUserId(2L, NOW);
        verify(rateLimiter).reset("password:operador@smartlogix.cl");
    }

    @Test
    void shouldUseWriteLockWhenDeactivatingUser() {
        UserEntity operator = user(2L, "operador@smartlogix.cl", RoleName.OPERATOR, true);
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(operator));
        when(clock.instant()).thenReturn(NOW);

        UserResponse response = userManagementService.deactivate(2L, "admin@smartlogix.cl");

        assertThat(response.getActive()).isFalse();
        verify(userRepository).findByIdForUpdate(2L);
        verify(userRepository, never()).findById(2L);
        verify(challengeRepository).invalidateActiveByUserId(2L, NOW);
    }

    @Test
    void shouldInvalidateChallengesWhenUpdateDeactivatesUser() {
        UserEntity operator = user(2L, "operador@smartlogix.cl", RoleName.OPERATOR, true);
        UpdateUserRequest request = new UpdateUserRequest();
        request.setActive(false);
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(operator));
        when(clock.instant()).thenReturn(NOW);

        userManagementService.update(2L, request, "admin@smartlogix.cl");

        assertThat(operator.getActive()).isFalse();
        verify(challengeRepository).invalidateActiveByUserId(2L, NOW);
    }

    private CreateUserRequest createUserRequest(String email, String password, RoleName roleName) {
        CreateUserRequest request = new CreateUserRequest();
        request.setFullName("Usuario SmartLogix");
        request.setEmail(email);
        request.setPassword(password);
        request.setRole(roleName);
        return request;
    }

    private UserEntity user(Long id, String email, RoleName roleName, boolean active) {
        return UserEntity.builder()
                .id(id)
                .email(email)
                .fullName("Usuario SmartLogix")
                .password("hash")
                .active(active)
                .role(role(roleName))
                .build();
    }

    private RoleEntity role(RoleName roleName) {
        return RoleEntity.builder()
                .id((long) roleName.ordinal() + 1)
                .name(roleName)
                .description(roleName.name())
                .build();
    }
}
