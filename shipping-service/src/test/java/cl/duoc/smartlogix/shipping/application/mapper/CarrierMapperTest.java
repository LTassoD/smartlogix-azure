package cl.duoc.smartlogix.shipping.application.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cl.duoc.smartlogix.shipping.domain.enums.CarrierCode;
import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.presentation.dto.response.CarrierResponse;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class CarrierMapperTest {

    @Test
    void toResponseMapsCarrier() {
        LocalDateTime now = LocalDateTime.now();
        CarrierEntity entity = CarrierEntity.builder()
                .code(CarrierCode.CHILEXPRESS.name())
                .name("Chilexpress")
                .serviceType("NATIONAL")
                .active(true)
                .simulatedAvailable(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        entity.setId(1L);

        CarrierResponse response = CarrierMapper.toResponse(entity);

        assertEquals(1L, response.getId());
        assertEquals("CHILEXPRESS", response.getCode());
        assertTrue(response.getSimulatedAvailable());
    }
}
