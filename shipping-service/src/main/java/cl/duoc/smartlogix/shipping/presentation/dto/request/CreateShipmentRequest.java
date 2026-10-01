package cl.duoc.smartlogix.shipping.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreateShipmentRequest {

    @NotNull
    @Positive
    private Long orderId;

    @NotBlank
    private String orderNumber;

    @NotNull
    @Positive
    private Long customerId;

    @NotBlank
    private String destinationAddress;

    @NotBlank
    private String destinationCity;
}
