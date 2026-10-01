package cl.duoc.smartlogix.inventory.application.mapper;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.WarehouseEntity;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateWarehouseRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.WarehouseResponse;

public final class WarehouseMapper {

    private WarehouseMapper() {
    }

    public static WarehouseEntity toEntity(CreateWarehouseRequest request) {
        return WarehouseEntity.builder()
                .code(request.getCode())
                .name(request.getName())
                .address(request.getAddress())
                .active(true)
                .build();
    }

    public static WarehouseResponse toResponse(WarehouseEntity entity) {
        return WarehouseResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .address(entity.getAddress())
                .active(entity.getActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
