package cl.duoc.smartlogix.identity.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import cl.duoc.smartlogix.identity.infrastructure.persistence.entity.UserEntity;
import com.bastiaanjansen.otp.TOTPGenerator;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class TotpServiceTest {

    @Test
    void shouldAcceptCurrentCodeOnlyOnceAndPersistItsCounter() {
        Clock clock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        TwoFactorProperties properties = new TwoFactorProperties();
        properties.setIssuer("SmartLogix");
        TotpService service = new TotpService(properties, clock);
        String secret = service.generateSecret();
        String code = new TOTPGenerator.Builder(secret)
                .withClock(clock)
                .withPeriod(Duration.ofSeconds(30))
                .build()
                .now();
        UserEntity user = UserEntity.builder().id(9L).build();

        assertThat(service.verifyAndConsume(user, secret, code)).isTrue();
        assertThat(user.getTwoFactorLastUsedCounter()).isNotNull();
        assertThat(service.verifyAndConsume(user, secret, code)).isFalse();
    }

    @Test
    void shouldBuildAuthenticatorCompatibleUriWithoutExposingItElsewhere() {
        TwoFactorProperties properties = new TwoFactorProperties();
        properties.setIssuer("SmartLogix");
        TotpService service = new TotpService(
                properties,
                Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC)
        );

        String uri = service.buildOtpAuthUri("JBSWY3DPEHPK3PXP", "user@example.com");

        assertThat(uri).startsWith("otpauth://totp/");
        assertThat(uri).contains("issuer=SmartLogix");
        assertThat(uri).contains("secret=JBSWY3DPEHPK3PXP");
    }
}
