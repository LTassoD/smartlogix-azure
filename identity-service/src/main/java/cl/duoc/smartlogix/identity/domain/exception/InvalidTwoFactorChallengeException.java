package cl.duoc.smartlogix.identity.domain.exception;

public class InvalidTwoFactorChallengeException extends RuntimeException {

    public InvalidTwoFactorChallengeException(String message) {
        super(message);
    }
}
