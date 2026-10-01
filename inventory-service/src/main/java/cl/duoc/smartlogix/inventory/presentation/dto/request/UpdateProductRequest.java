package cl.duoc.smartlogix.inventory.presentation.dto.request;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProductRequest {

    private String sku;
    private String name;
    private String description;

    @DecimalMin("0.0")
    private BigDecimal unitPrice;

    private Boolean active;
}
