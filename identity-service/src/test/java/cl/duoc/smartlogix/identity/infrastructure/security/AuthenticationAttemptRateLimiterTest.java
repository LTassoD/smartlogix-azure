package cl.duoc.smartlogix.identity.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class AuthenticationAttemptRateLimiterTest {

    @Test
    void shouldBlockOnFifthFailureForSixtySeconds() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        TwoFactorProperties properties = new TwoFactorProperties();
        properties.setLoginMaxFailures(5);
        properties.setLoginWindowSeconds(300);
        properties.setLoginBlockSeconds(60);
        AuthenticationAttemptRateLimiter limiter = new AuthenticationAttemptRateLimiter(clock, properties);

        for (int attempt = 1; attempt < 5; attempt++) {
            assertThat(limiter.recordFailure("password:user@example.com")).isEmpty();
        }

        assertThat(limiter.recordFailure("password:user@example.com")).hasValue(60);
        assertThat(limiter.retryAfterIfBlocked("password:user@example.com")).hasValue(60);

        clock.advanceSeconds(61);

        assertThat(limiter.retryAfterIfBlocked("password:user@example.com")).isEmpty();
    }

    @Test
    void shouldFailClosedAtCapacityAndReclaimExpiredIdentityEntries() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        TwoFactorProperties properties = new TwoFactorProperties();
        properties.setLoginMaxFailures(5);
        properties.setLoginWindowSeconds(300);
        properties.setLoginBlockSeconds(60);
        properties.setRateLimitMaxEntries(100);
        AuthenticationAttemptRateLimiter limiter = new AuthenticationAttemptRateLimiter(clock, properties);

        for (int identity = 0; identity < 100; identity++) {
            assertThat(limiter.recordFailure("password:attacker-" + identity + "@example.com")).isEmpty();
        }
        assertThat(limiter.recordFailure("password:capacity@example.com")).hasValue(60);

        clock.advanceSeconds(301);

        assertThat(limiter.recordFailure("password:capacity@example.com")).isEmpty();
    }

    private static final class MutableClock extends Clock {

        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
