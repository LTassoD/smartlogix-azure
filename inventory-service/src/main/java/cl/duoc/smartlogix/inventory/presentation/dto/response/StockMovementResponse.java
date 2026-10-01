package cl.duoc.smartlogix.inventory.presentation.dto.response;

import cl.duoc.smartlogix.inventory.domain.enums.StockMovementType;
import java.time.LocalDateTime;
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
public class StockMovementResponse {

    private Long id;
    private Long productId;
    private String productSku;
    private String productName;
    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private StockMovementType type;
    private Integer quantity;
    private String reason;
    private String referenceCode;
    private LocalDateTime createdAt;
}
