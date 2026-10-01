package cl.duoc.smartlogix.identity.application.service.impl;

import cl.duoc.smartlogix.identity.application.mapper.UserMapper;
import cl.duoc.smartlogix.identity.application.service.UserManagementService;
import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.identity.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.identity.domain.exception.InvalidCredentialsException;
import cl.duoc.smartlogix.identity.domain.exception.ResourceNotFoundException;
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
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserManagementServiceImpl implements UserManagementService {

    private static final Pattern STRONG_PASSWORD = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TwoFactorChallengeRepository challengeRepository;
    private final AuthenticationAttemptRateLimiter rateLimiter;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(UserEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(UserMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return UserMapper.toResponse(findUser(id));
    }

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("Ya existe un usuario con ese email.");
        }

        validatePassword(request.getPassword());

        RoleEntity role = findRole(request.getRole());
        UserEntity user = UserEntity.builder()
                .email(email)
                .fullName(request.getFullName().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .active(true)
                .build();

        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request, String currentUserEmail) {
        UserEntity user = findLockedUser(id);

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getActive() != null) {
            if (Boolean.FALSE.equals(request.getActive())) {
                ensureUserCanBeDeactivated(user, currentUserEmail);
            }

            user.setActive(request.getActive());
            if (Boolean.FALSE.equals(request.getActive())) {
                invalidateActiveChallenges(user);
            }
        }

        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateRole(Long id, UpdateUserRoleRequest request) {
        UserEntity user = findLockedUser(id);

        if (user.getRole().getName() == RoleName.ADMIN && request.getRole() != RoleName.ADMIN && activeAdminCount() <= 1) {
            throw new BusinessRuleException("Debe existir al menos un administrador activo.");
        }

        user.setRole(findRole(request.getRole()));
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse resetPassword(Long id, ResetUserPasswordRequest request) {
        UserEntity user = findLockedUser(id);
        validatePassword(request.getNewPassword());
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        invalidateChallengesAndResetPasswordLimiter(user);
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public void changeOwnPassword(String email, ChangeOwnPasswordRequest request) {
        UserEntity user = userRepository.findByEmailIgnoreCaseForUpdate(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("La contrasena actual no es correcta.");
        }

        validatePassword(request.getNewPassword());
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        invalidateChallengesAndResetPasswordLimiter(user);
    }

    @Override
    @Transactional
    public UserResponse deactivate(Long id, String currentUserEmail) {
        UserEntity user = findLockedUser(id);
        ensureUserCanBeDeactivated(user, currentUserEmail);
        user.setActive(false);
        invalidateActiveChallenges(user);
        return UserMapper.toResponse(user);
    }

    private UserEntity findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
    }

    private UserEntity findLockedUser(Long id) {
        return userRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
    }

    private RoleEntity findRole(RoleName roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado."));
    }

    private void ensureUserCanBeDeactivated(UserEntity user, String currentUserEmail) {
        boolean targetIsAdmin = user.getRole().getName() == RoleName.ADMIN;
        boolean currentUserIsTarget = user.getEmail().equalsIgnoreCase(currentUserEmail);

        if (targetIsAdmin && activeAdminCount() <= 1) {
            throw new BusinessRuleException("Debe existir al menos un administrador activo.");
        }

        if (currentUserIsTarget && targetIsAdmin) {
            throw new BusinessRuleException("No puedes desactivar tu propia cuenta de administrador.");
        }
    }

    private long activeAdminCount() {
        return userRepository.countByActiveTrueAndRole_Name(RoleName.ADMIN);
    }

    private void invalidateChallengesAndResetPasswordLimiter(UserEntity user) {
        invalidateActiveChallenges(user);
        rateLimiter.reset("password:" + normalizeEmail(user.getEmail()));
    }

    private void invalidateActiveChallenges(UserEntity user) {
        challengeRepository.invalidateActiveByUserId(user.getId(), clock.instant());
    }

    private void validatePassword(String password) {
        if (!STRONG_PASSWORD.matcher(password).matches()) {
            throw new BusinessRuleException("La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero.");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
