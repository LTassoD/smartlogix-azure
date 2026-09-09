package cl.duoc.smartlogix.identity.domain.exception;

public class InvalidTwoFactorCodeException extends RuntimeException {

    public InvalidTwoFactorCodeException(String message) {
        super(message);
    }
}
