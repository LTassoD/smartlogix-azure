package cl.duoc.smartlogix.inventory.shared.response;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void shouldBuildApiResponse() {
        ApiResponse<String> response = ApiResponse.<String>builder()
                .success(true)
                .message("Inventory ready")
                .data("OK")
                .build();

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Inventory ready");
        assertThat(response.getData()).isEqualTo("OK");
    }
}
