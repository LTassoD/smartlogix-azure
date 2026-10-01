package cl.duoc.smartlogix.identity.infrastructure.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TwoFactorSecretEncryptionService {

    private final TextEncryptor twoFactorTextEncryptor;

    public String encrypt(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("TOTP secret is required");
        }
        return twoFactorTextEncryptor.encrypt(secret);
    }

    public String decrypt(String encryptedSecret) {
        if (encryptedSecret == null || encryptedSecret.isBlank()) {
            throw new IllegalArgumentException("Encrypted TOTP secret is required");
        }
        return twoFactorTextEncryptor.decrypt(encryptedSecret);
    }
}
