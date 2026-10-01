package cl.duoc.smartlogix.gateway.system;

import java.time.Instant;
import java.util.List;

public record SystemHealthResponse(
        String status,
        Instant checkedAt,
        List<SystemServiceHealthResponse> services
) {
}
