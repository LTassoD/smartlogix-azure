package cl.duoc.smartlogix.identity.presentation.dto.response;

public record TwoFactorSetupResponse(
        String otpauthUri,
        long expiresInSeconds
) {
}
