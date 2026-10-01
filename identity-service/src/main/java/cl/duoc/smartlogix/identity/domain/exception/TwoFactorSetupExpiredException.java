package cl.duoc.smartlogix.identity.domain.exception;

public class TwoFactorSetupExpiredException extends RuntimeException {

    public TwoFactorSetupExpiredException(String message) {
        super(message);
    }
}
