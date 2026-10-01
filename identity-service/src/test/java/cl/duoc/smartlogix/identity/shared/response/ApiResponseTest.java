package cl.duoc.smartlogix.identity.shared.response;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void shouldBuildApiResponse() {
        ApiResponse<String> response = ApiResponse.<String>builder()
                .success(true)
                .message("Login successful")
                .data("token")
                .build();

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Login successful");
        assertThat(response.getData()).isEqualTo("token");
    }
}
