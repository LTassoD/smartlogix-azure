package cl.duoc.smartlogix.identity.infrastructure.security;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordAuthenticationVerifier {

    private final PasswordEncoder passwordEncoder;
    private final String dummyPasswordHash;

    public PasswordAuthenticationVerifier(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
        byte[] randomPassword = new byte[32];
        new SecureRandom().nextBytes(randomPassword);
        this.dummyPasswordHash = passwordEncoder.encode(Base64.getEncoder().encodeToString(randomPassword));
    }

    /** Always performs one BCrypt comparison, including when the account does not exist. */
    public boolean matches(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(
                rawPassword == null ? "" : rawPassword,
                encodedPassword == null ? dummyPasswordHash : encodedPassword
        );
    }
}
