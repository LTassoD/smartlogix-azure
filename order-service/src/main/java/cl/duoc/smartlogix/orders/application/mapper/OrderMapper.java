package cl.duoc.smartlogix.orders.application.mapper;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderEntity;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderResponse;

public final class OrderMapper {

    private OrderMapper() {
    }

    public static OrderResponse toResponse(OrderEntity entity) {
        return OrderResponse.builder()
                .id(entity.getId())
                .orderNumber(entity.getOrderNumber())
                .customer(CustomerMapper.toResponse(entity.getCustomer()))
                .status(entity.getStatus())
                .totalAmount(entity.getTotalAmount())
                .notes(entity.getNotes())
                .items(entity.getItems().stream()
                        .map(OrderItemMapper::toResponse)
                        .toList())
                .history(entity.getHistory().stream()
                        .map(OrderStatusHistoryMapper::toResponse)
                        .toList())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
