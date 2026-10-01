package cl.duoc.smartlogix.orders.shared.response;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void builderCreatesApiResponse() {
        ApiResponse<String> response = ApiResponse.<String>builder()
                .success(true)
                .message("OK")
                .data("payload")
                .build();

        assertTrue(response.isSuccess());
        assertEquals("OK", response.getMessage());
        assertEquals("payload", response.getData());
    }
}
