package cl.duoc.smartlogix.gateway.shared.response;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void shouldBuildApiResponse() {
        ApiResponse<String> response = ApiResponse.<String>builder()
                .success(true)
                .message("Gateway ready")
                .data("OK")
                .build();

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Gateway ready");
        assertThat(response.getData()).isEqualTo("OK");
    }
}
