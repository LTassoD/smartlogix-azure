package cl.duoc.smartlogix.identity.presentation.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRequest {

    @Size(max = 160)
    private String fullName;

    private Boolean active;
}
