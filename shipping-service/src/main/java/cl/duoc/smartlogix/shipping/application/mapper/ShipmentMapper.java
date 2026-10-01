package cl.duoc.smartlogix.shipping.application.mapper;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;

public final class ShipmentMapper {

    private ShipmentMapper() {
    }

    public static ShipmentResponse toResponse(ShipmentEntity entity) {
        return ShipmentResponse.builder()
                .id(entity.getId())
                .shipmentNumber(entity.getShipmentNumber())
                .orderId(entity.getOrderId())
                .orderNumber(entity.getOrderNumber())
                .customerId(entity.getCustomerId())
                .carrier(CarrierMapper.toResponse(entity.getCarrier()))
                .status(entity.getStatus())
                .destinationAddress(entity.getDestinationAddress())
                .destinationCity(entity.getDestinationCity())
                .trackingCode(entity.getTrackingCode())
                .fallbackReason(entity.getFallbackReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .assignedAt(entity.getAssignedAt())
                .shippedAt(entity.getShippedAt())
                .deliveredAt(entity.getDeliveredAt())
                .build();
    }
}
