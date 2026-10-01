package cl.duoc.smartlogix.inventory.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ErrorResponseTest {

    @Test
    void shouldBuildErrorResponse() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-04-30T21:00:00")
                .status(400)
                .error("Bad Request")
                .message("Invalid inventory request")
                .path("/api/inventory/products")
                .build();

        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getError()).isEqualTo("Bad Request");
        assertThat(response.getMessage()).isEqualTo("Invalid inventory request");
        assertThat(response.getPath()).isEqualTo("/api/inventory/products");
    }
}
