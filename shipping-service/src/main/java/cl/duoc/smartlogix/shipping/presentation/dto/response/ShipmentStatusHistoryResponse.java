package cl.duoc.smartlogix.shipping.presentation.dto.response;

import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import java.time.LocalDateTime;
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
public class ShipmentStatusHistoryResponse {

    private Long id;
    private ShipmentStatus previousStatus;
    private ShipmentStatus newStatus;
    private String comment;
    private LocalDateTime createdAt;
}
