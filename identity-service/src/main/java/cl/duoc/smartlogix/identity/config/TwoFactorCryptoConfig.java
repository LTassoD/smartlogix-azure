package cl.duoc.smartlogix.identity.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;

@Configuration
public class TwoFactorCryptoConfig {

    @Bean
    @SuppressWarnings("deprecation")
    public TextEncryptor twoFactorTextEncryptor(TwoFactorProperties properties) {
        String password = properties.getEncryptionPassword();
        String salt = properties.getEncryptionSalt();

        if (password == null || password.length() < 32) {
            throw new IllegalStateException(
                    "SMARTLOGIX_2FA_ENCRYPTION_PASSWORD must contain at least 32 characters"
            );
        }
        if (salt == null || !salt.matches("(?i)^[0-9a-f]{16,}$") || (salt.length() & 1) != 0) {
            throw new IllegalStateException(
                    "SMARTLOGIX_2FA_ENCRYPTION_SALT must be even-length hexadecimal with at least 16 characters"
            );
        }

        // delux wraps the authenticated AES-256-GCM Spring Security encryptor and hex-encodes its output.
        return Encryptors.delux(password, salt);
    }

    @Bean
    public Clock systemClock() {
        return Clock.systemUTC();
    }
}
