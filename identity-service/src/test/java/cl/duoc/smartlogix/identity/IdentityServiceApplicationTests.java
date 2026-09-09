package cl.duoc.smartlogix.identity;

import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.RoleRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.TwoFactorChallengeRepository;
import cl.duoc.smartlogix.identity.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "smartlogix.seed.enabled=false",
        "smartlogix.two-factor.encryption-password=test-only-encryption-password-32-characters",
        "smartlogix.two-factor.encryption-salt=0011223344556677",
        "smartlogix.jwt.issuer=smartlogix-test-issuer",
        "smartlogix.jwt.expiration-seconds=3600",
        "smartlogix.jwt.secret=test-only-jwt-signing-key-at-least-32-bytes-long",
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration"
})
class IdentityServiceApplicationTests {

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private RoleRepository roleRepository;

    @MockitoBean
    private TwoFactorChallengeRepository twoFactorChallengeRepository;

    @Test
    void contextLoads() {
    }
}
