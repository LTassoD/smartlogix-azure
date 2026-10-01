package cl.duoc.smartlogix.orders.presentation.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
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
public class CreateOrderItemRequest {

    @NotNull
    private Long productId;

    @NotNull
    private Long warehouseId;

    @NotBlank
    private String sku;

    @NotBlank
    private String productName;

    @NotNull
    @DecimalMin(value = "0.00")
    private BigDecimal unitPrice;

    @NotNull
    @Positive
    private Integer quantity;
}
