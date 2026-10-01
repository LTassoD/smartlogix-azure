package cl.duoc.smartlogix.identity.presentation.dto.request;

import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserRequest {

    @NotBlank
    @Size(max = 160)
    private String fullName;

    @Email
    @NotBlank
    @Size(max = 160)
    private String email;

    @NotNull
    private RoleName role;

    @NotBlank
    @Size(min = 8, max = 120)
    private String password;
}
