package cl.duoc.smartlogix.shipping.application.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import cl.duoc.smartlogix.shipping.domain.enums.CarrierCode;
import cl.duoc.smartlogix.shipping.domain.enums.ShipmentStatus;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.ShipmentEntity;
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class ShipmentMapperTest {

    @Test
    void toResponseMapsShipment() {
        LocalDateTime now = LocalDateTime.now();
        CarrierEntity carrier = CarrierEntity.builder()
                .code(CarrierCode.STARKEN.name())
                .name("Starken")
                .serviceType("NATIONAL")
                .active(true)
                .simulatedAvailable(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        carrier.setId(2L);

        ShipmentEntity shipment = ShipmentEntity.builder()
                .shipmentNumber("SHP-20260507-10001")
                .orderId(1L)
                .orderNumber("ORD-20260507-10001")
                .customerId(1L)
                .carrier(carrier)
                .status(ShipmentStatus.ASSIGNED)
                .destinationAddress("Av. Siempre Viva 123")
                .destinationCity("Santiago")
                .trackingCode("STK-SHP-20260507-10001")
                .createdAt(now)
                .updatedAt(now)
                .assignedAt(now)
                .build();
        shipment.setId(10L);

        ShipmentResponse response = ShipmentMapper.toResponse(shipment);

        assertEquals(10L, response.getId());
        assertEquals("SHP-20260507-10001", response.getShipmentNumber());
        assertEquals(ShipmentStatus.ASSIGNED, response.getStatus());
        assertEquals("STARKEN", response.getCarrier().getCode());
    }
}
