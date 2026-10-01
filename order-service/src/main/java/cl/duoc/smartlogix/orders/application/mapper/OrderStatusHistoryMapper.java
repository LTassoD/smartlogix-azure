package cl.duoc.smartlogix.orders.application.mapper;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderStatusHistoryEntity;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderStatusHistoryResponse;

public final class OrderStatusHistoryMapper {

    private OrderStatusHistoryMapper() {
    }

    public static OrderStatusHistoryResponse toResponse(OrderStatusHistoryEntity entity) {
        return OrderStatusHistoryResponse.builder()
                .id(entity.getId())
                .previousStatus(entity.getPreviousStatus())
                .newStatus(entity.getNewStatus())
                .comment(entity.getComment())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
