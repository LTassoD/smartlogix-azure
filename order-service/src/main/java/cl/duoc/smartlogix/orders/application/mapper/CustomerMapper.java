package cl.duoc.smartlogix.orders.application.mapper;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateCustomerRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.CustomerResponse;

public final class CustomerMapper {

    private CustomerMapper() {
    }

    public static CustomerEntity toEntity(CreateCustomerRequest request) {
        return CustomerEntity.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .active(true)
                .build();
    }

    public static CustomerResponse toResponse(CustomerEntity entity) {
        return CustomerResponse.builder()
                .id(entity.getId())
                .fullName(entity.getFullName())
                .email(entity.getEmail())
                .phone(entity.getPhone())
                .address(entity.getAddress())
                .active(entity.getActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
