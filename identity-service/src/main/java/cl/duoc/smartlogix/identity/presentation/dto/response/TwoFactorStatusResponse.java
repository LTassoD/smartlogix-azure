package cl.duoc.smartlogix.identity.presentation.dto.response;

import java.time.LocalDateTime;

public record TwoFactorStatusResponse(
        boolean enabled,
        boolean setupPending,
        LocalDateTime pendingExpiresAt
) {
}
