package cl.duoc.smartlogix.shipping.shared.error;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ErrorResponseTest {

    @Test
    void builderCreatesErrorResponse() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-05-07T20:00:00")
                .status(400)
                .error("Bad Request")
                .message("Invalid data")
                .path("/api/shipping")
                .build();

        assertEquals(400, response.getStatus());
        assertEquals("Bad Request", response.getError());
        assertEquals("Invalid data", response.getMessage());
        assertEquals("/api/shipping", response.getPath());
    }
}
