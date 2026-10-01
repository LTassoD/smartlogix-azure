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
public class ShipmentResponse {

    private Long id;
    private String shipmentNumber;
    private Long orderId;
    private String orderNumber;
    private Long customerId;
    private CarrierResponse carrier;
    private ShipmentStatus status;
    private String destinationAddress;
    private String destinationCity;
    private String trackingCode;
    private String fallbackReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime assignedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
}
