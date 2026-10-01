package cl.duoc.smartlogix.identity.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetUserPasswordRequest {

    @NotBlank
    @Size(min = 8, max = 120)
    private String newPassword;
}
