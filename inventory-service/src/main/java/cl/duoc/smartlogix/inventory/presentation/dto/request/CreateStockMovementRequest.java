package cl.duoc.smartlogix.inventory.presentation.dto.request;

import cl.duoc.smartlogix.inventory.domain.enums.StockMovementType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreateStockMovementRequest {

    @NotNull
    private Long productId;

    @NotNull
    private Long warehouseId;

    @NotNull
    private StockMovementType type;

    @NotNull
    @Positive
    private Integer quantity;

    private String reason;
    private String referenceCode;
}
