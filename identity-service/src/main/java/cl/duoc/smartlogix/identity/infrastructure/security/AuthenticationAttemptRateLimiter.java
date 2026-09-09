package cl.duoc.smartlogix.identity.infrastructure.security;

import cl.duoc.smartlogix.identity.config.TwoFactorProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.OptionalLong;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

@Component
public class AuthenticationAttemptRateLimiter {

    private final ConcurrentHashMap<String, AttemptState> states = new ConcurrentHashMap<>();
    private final AtomicLong operations = new AtomicLong();
    private final Clock clock;
    private final TwoFactorProperties properties;

    public AuthenticationAttemptRateLimiter(Clock clock, TwoFactorProperties properties) {
        this.clock = clock;
        this.properties = properties;
    }

    public OptionalLong retryAfterIfBlocked(String key) {
        Instant now = clock.instant();
        prunePeriodically(now);
        AttemptState state = states.get(key);
        if (state == null) {
            return OptionalLong.empty();
        }

        synchronized (state) {
            if (state.blockedUntil != null && now.isBefore(state.blockedUntil)) {
                return OptionalLong.of(secondsUntil(now, state.blockedUntil));
            }
            if (state.blockedUntil != null) {
                states.remove(key, state);
            } else if (windowExpired(state, now)) {
                states.remove(key, state);
            }
            return OptionalLong.empty();
        }
    }

    public OptionalLong recordFailure(String key) {
        Instant now = clock.instant();
        prunePeriodically(now);
        if (!states.containsKey(key) && states.size() >= properties.getRateLimitMaxEntries()) {
            cleanupExpired(now);
            if (states.size() >= properties.getRateLimitMaxEntries()) {
                // Fail closed for new attacker-controlled identities while keeping memory bounded.
                return OptionalLong.of(properties.getLoginBlockSeconds());
            }
        }
        AttemptState state = states.computeIfAbsent(key, ignored -> new AttemptState());
        synchronized (state) {
            if (state.blockedUntil != null && now.isBefore(state.blockedUntil)) {
                return OptionalLong.of(secondsUntil(now, state.blockedUntil));
            }

            Instant windowEnd = state.windowStartedAt == null
                    ? null
                    : state.windowStartedAt.plusSeconds(properties.getLoginWindowSeconds());
            if (windowEnd == null || !now.isBefore(windowEnd) || state.blockedUntil != null) {
                state.windowStartedAt = now;
                state.failures = 0;
                state.blockedUntil = null;
            }

            state.failures++;
            if (state.failures >= properties.getLoginMaxFailures()) {
                state.blockedUntil = now.plusSeconds(properties.getLoginBlockSeconds());
                return OptionalLong.of(properties.getLoginBlockSeconds());
            }
            return OptionalLong.empty();
        }
    }

    public void reset(String key) {
        states.remove(key);
    }

    private long secondsUntil(Instant now, Instant blockedUntil) {
        long seconds = blockedUntil.getEpochSecond() - now.getEpochSecond();
        return Math.max(1, seconds);
    }

    private void prunePeriodically(Instant now) {
        if ((operations.incrementAndGet() & 255L) == 0L) {
            cleanupExpired(now);
        }
    }

    private void cleanupExpired(Instant now) {
        states.forEach((key, state) -> {
            synchronized (state) {
                boolean expiredBlock = state.blockedUntil != null && !now.isBefore(state.blockedUntil);
                if (expiredBlock || (state.blockedUntil == null && windowExpired(state, now))) {
                    states.remove(key, state);
                }
            }
        });
    }

    private boolean windowExpired(AttemptState state, Instant now) {
        return state.windowStartedAt != null
                && !now.isBefore(state.windowStartedAt.plusSeconds(properties.getLoginWindowSeconds()));
    }

    private static final class AttemptState {
        private Instant windowStartedAt;
        private int failures;
        private Instant blockedUntil;
    }
}
