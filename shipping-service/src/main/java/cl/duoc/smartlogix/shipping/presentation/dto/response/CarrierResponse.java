package cl.duoc.smartlogix.shipping.presentation.dto.response;

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
public class CarrierResponse {

    private Long id;
    private String code;
    private String name;
    private String serviceType;
    private Boolean active;
    private Boolean simulatedAvailable;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
