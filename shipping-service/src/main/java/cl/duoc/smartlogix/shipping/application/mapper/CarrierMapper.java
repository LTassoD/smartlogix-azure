package cl.duoc.smartlogix.shipping.application.mapper;

import cl.duoc.smartlogix.shipping.infrastructure.persistence.entity.CarrierEntity;
import cl.duoc.smartlogix.shipping.presentation.dto.response.CarrierResponse;

public final class CarrierMapper {

    private CarrierMapper() {
    }

    public static CarrierResponse toResponse(CarrierEntity entity) {
        if (entity == null) {
            return null;
        }

        return CarrierResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .serviceType(entity.getServiceType())
                .active(entity.getActive())
                .simulatedAvailable(entity.getSimulatedAvailable())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
