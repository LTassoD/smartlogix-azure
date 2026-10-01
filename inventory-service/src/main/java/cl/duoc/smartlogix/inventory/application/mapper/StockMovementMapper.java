package cl.duoc.smartlogix.inventory.application.mapper;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockMovementEntity;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockMovementResponse;

public final class StockMovementMapper {

    private StockMovementMapper() {
    }

    public static StockMovementResponse toResponse(StockMovementEntity entity) {
        return StockMovementResponse.builder()
                .id(entity.getId())
                .productId(entity.getProduct().getId())
                .productSku(entity.getProduct().getSku())
                .productName(entity.getProduct().getName())
                .warehouseId(entity.getWarehouse().getId())
                .warehouseCode(entity.getWarehouse().getCode())
                .warehouseName(entity.getWarehouse().getName())
                .type(entity.getType())
                .quantity(entity.getQuantity())
                .reason(entity.getReason())
                .referenceCode(entity.getReferenceCode())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
