package cl.duoc.smartlogix.identity.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TwoFactorCodeRequest {

    @NotBlank
    @Pattern(regexp = "^\\d{6}$", message = "debe contener exactamente 6 dígitos")
    private String code;
}
