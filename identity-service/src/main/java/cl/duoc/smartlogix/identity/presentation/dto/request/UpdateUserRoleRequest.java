package cl.duoc.smartlogix.identity.presentation.dto.request;

import cl.duoc.smartlogix.identity.domain.enums.RoleName;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRoleRequest {

    @NotNull
    private RoleName role;
}
