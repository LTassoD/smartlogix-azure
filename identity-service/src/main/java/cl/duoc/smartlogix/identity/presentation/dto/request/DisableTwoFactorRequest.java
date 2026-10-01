package cl.duoc.smartlogix.identity.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DisableTwoFactorRequest {

    @NotBlank(message = "La contraseña actual es obligatoria")
    @Size(max = 128, message = "La contraseña actual no puede exceder 128 caracteres")
    private String currentPassword;
}
