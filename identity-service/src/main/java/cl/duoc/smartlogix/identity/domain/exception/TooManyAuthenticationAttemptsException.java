package cl.duoc.smartlogix.identity.domain.exception;

public class TooManyAuthenticationAttemptsException extends RuntimeException {

    private final long retryAfterSeconds;

    public TooManyAuthenticationAttemptsException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
