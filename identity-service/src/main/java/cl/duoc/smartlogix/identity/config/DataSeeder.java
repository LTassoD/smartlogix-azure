package cl.duoc.smartlogix.identity.config;

import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.RoleEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.RoleRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.env.Environment;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private static final Pattern STRONG_PASSWORD = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$");

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Bean
    @ConditionalOnProperty(name = "smartlogix.seed.enabled", havingValue = "true")
    CommandLineRunner seedIdentityData() {
        return args -> {
            RoleEntity admin = seedRole(RoleName.ADMIN, "Administrador del sistema");
            RoleEntity operator = seedRole(RoleName.OPERATOR, "Operador logistico");
            RoleEntity viewer = seedRole(RoleName.VIEWER, "Usuario solo lectura");

            seedConfiguredUser("admin", admin);
            seedConfiguredUser("operator", operator);
            seedConfiguredUser("viewer", viewer);
        };
    }

    private void seedConfiguredUser(String account, RoleEntity role) {
        String prefix = "smartlogix.seed." + account + "-";
        String email = environment.getProperty(prefix + "email");
        String password = environment.getProperty(prefix + "password");
        String fullName = environment.getProperty(prefix + "full-name");
        if (isBlank(email) || isBlank(password) || isBlank(fullName)) {
            throw new IllegalStateException(
                    "Explicit email, password and full name are required for the " + account + " seed account"
            );
        }
        if (!STRONG_PASSWORD.matcher(password).matches()) {
            throw new IllegalStateException(
                    "Configured seed passwords must contain at least 8 characters, uppercase, lowercase and a number"
            );
        }
        seedUser(email.trim().toLowerCase(Locale.ROOT), password, fullName.trim(), role);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private RoleEntity seedRole(RoleName name, String description) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(RoleEntity.builder()
                        .name(name)
                        .description(description)
                        .build()));
    }

    private void seedUser(String email, String password, String fullName, RoleEntity role) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }

        userRepository.save(UserEntity.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .fullName(fullName)
                .role(role)
                .active(true)
                .build());
    }
}
