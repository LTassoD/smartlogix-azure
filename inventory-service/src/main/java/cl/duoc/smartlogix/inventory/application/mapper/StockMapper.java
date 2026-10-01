package cl.duoc.smartlogix.inventory.application.mapper;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.StockEntity;
import cl.duoc.smartlogix.inventory.presentation.dto.response.StockResponse;

public final class StockMapper {

    private StockMapper() {
    }

    public static StockResponse toResponse(StockEntity entity) {
        return StockResponse.builder()
                .id(entity.getId())
                .productId(entity.getProduct().getId())
                .productSku(entity.getProduct().getSku())
                .productName(entity.getProduct().getName())
                .warehouseId(entity.getWarehouse().getId())
                .warehouseCode(entity.getWarehouse().getCode())
                .warehouseName(entity.getWarehouse().getName())
                .quantity(entity.getQuantity())
                .minimumStock(entity.getMinimumStock())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
