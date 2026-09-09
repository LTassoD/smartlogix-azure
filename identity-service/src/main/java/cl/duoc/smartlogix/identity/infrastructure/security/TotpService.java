package cl.duoc.smartlogix.identity.infrastructure.security;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import com.bastiaanjansen.otp.SecretGenerator;
import com.bastiaanjansen.otp.TOTPGenerator;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TotpService {

    private static final Duration PERIOD = Duration.ofSeconds(30);
    private static final int CLOCK_DRIFT_WINDOWS = 1;

    private final TwoFactorProperties properties;
    private final Clock clock;

    public String generateSecret() {
        return new String(SecretGenerator.generate(), StandardCharsets.US_ASCII);
    }

    public String buildOtpAuthUri(String secret, String account) {
        try {
            return generator(secret, null)
                    .getURI(properties.getIssuer(), account)
                    .toASCIIString();
        } catch (URISyntaxException exception) {
            throw new IllegalStateException("Could not create OTP Auth URI", exception);
        }
    }

    /**
     * Verifies and consumes a TOTP counter. The caller must hold a database write lock
     * for the managed user entity so check-and-set remains atomic across requests/nodes.
     */
    public boolean verifyAndConsume(UserEntity lockedUser, String secret, String code) {
        if (code == null || !code.matches("^\\d{6}$")) {
            return false;
        }

        return generator(secret, counter -> {
            Long lastUsedCounter = lockedUser.getTwoFactorLastUsedCounter();
            if (lastUsedCounter != null && counter <= lastUsedCounter) {
                return false;
            }
            lockedUser.setTwoFactorLastUsedCounter(counter);
            return true;
        }).verify(code, CLOCK_DRIFT_WINDOWS);
    }

    private TOTPGenerator generator(String secret, com.bastiaanjansen.otp.CounterStorage counterStorage) {
        TOTPGenerator.Builder builder = new TOTPGenerator.Builder(secret)
                .withClock(clock)
                .withPeriod(PERIOD);
        if (counterStorage != null) {
            builder.withCounterStorage(counterStorage);
        }
        return builder.build();
    }
}
