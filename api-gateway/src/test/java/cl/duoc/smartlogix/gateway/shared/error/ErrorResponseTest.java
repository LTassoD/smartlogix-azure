package cl.duoc.smartlogix.gateway.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ErrorResponseTest {

    @Test
    void shouldBuildErrorResponse() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-04-30T20:30:00")
                .status(500)
                .error("Internal Server Error")
                .message("Unexpected gateway error")
                .path("/api/orders")
                .build();

        assertThat(response.getStatus()).isEqualTo(500);
        assertThat(response.getError()).isEqualTo("Internal Server Error");
        assertThat(response.getMessage()).isEqualTo("Unexpected gateway error");
        assertThat(response.getPath()).isEqualTo("/api/orders");
    }
}
