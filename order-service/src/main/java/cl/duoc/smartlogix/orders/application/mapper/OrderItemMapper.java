package cl.duoc.smartlogix.orders.application.mapper;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderItemEntity;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateOrderItemRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderItemResponse;
import java.math.BigDecimal;

public final class OrderItemMapper {

    private OrderItemMapper() {
    }

    public static OrderItemEntity toEntity(CreateOrderItemRequest request, BigDecimal subtotal) {
        return OrderItemEntity.builder()
                .productId(request.getProductId())
                .warehouseId(request.getWarehouseId())
                .sku(request.getSku())
                .productName(request.getProductName())
                .unitPrice(request.getUnitPrice())
                .quantity(request.getQuantity())
                .subtotal(subtotal)
                .build();
    }

    public static OrderItemResponse toResponse(OrderItemEntity entity) {
        return OrderItemResponse.builder()
                .id(entity.getId())
                .productId(entity.getProductId())
                .warehouseId(entity.getWarehouseId())
                .sku(entity.getSku())
                .productName(entity.getProductName())
                .unitPrice(entity.getUnitPrice())
                .quantity(entity.getQuantity())
                .subtotal(entity.getSubtotal())
                .build();
    }
}
