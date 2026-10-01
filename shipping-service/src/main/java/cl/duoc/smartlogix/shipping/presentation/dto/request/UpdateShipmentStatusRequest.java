package cl.duoc.smartlogix.shipping.presentation.dto.request;

import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateShipmentStatusRequest {

    @NotNull
    private ShipmentStatus status;

    private String comment;
}
