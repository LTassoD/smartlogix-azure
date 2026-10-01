package cl.duoc.smartlogix.shipping.application.mapper;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentStatusHistoryEntity;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentStatusHistoryResponse;

public final class ShipmentStatusHistoryMapper {

    private ShipmentStatusHistoryMapper() {
    }

    public static ShipmentStatusHistoryResponse toResponse(ShipmentStatusHistoryEntity entity) {
        return ShipmentStatusHistoryResponse.builder()
                .id(entity.getId())
                .previousStatus(entity.getPreviousStatus())
                .newStatus(entity.getNewStatus())
                .comment(entity.getComment())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
