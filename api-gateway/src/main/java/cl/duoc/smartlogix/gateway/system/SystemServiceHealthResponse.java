package cl.duoc.smartlogix.gateway.system;

public record SystemServiceHealthResponse(
        String key,
        String name,
        String status,
        String message
) {
}
