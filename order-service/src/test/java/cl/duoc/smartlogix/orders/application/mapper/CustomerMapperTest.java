package cl.duoc.smartlogix.orders.application.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateCustomerRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.CustomerResponse;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class CustomerMapperTest {

    @Test
    void toEntityMapsCreateRequest() {
        CreateCustomerRequest request = CreateCustomerRequest.builder()
                .fullName("Juan Perez")
                .email("juan.perez@demo.cl")
                .phone("+56911111111")
                .address("Santiago")
                .build();

        CustomerEntity entity = CustomerMapper.toEntity(request);

        assertEquals("Juan Perez", entity.getFullName());
        assertEquals("juan.perez@demo.cl", entity.getEmail());
        assertTrue(entity.getActive());
    }

    @Test
    void toResponseMapsEntity() {
        LocalDateTime now = LocalDateTime.now();
        CustomerEntity entity = CustomerEntity.builder()
                .fullName("Maria Gonzalez")
                .email("maria.gonzalez@demo.cl")
                .phone("+56922222222")
                .address("Valparaiso")
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        entity.setId(2L);

        CustomerResponse response = CustomerMapper.toResponse(entity);

        assertEquals(2L, response.getId());
        assertEquals("Maria Gonzalez", response.getFullName());
        assertEquals("maria.gonzalez@demo.cl", response.getEmail());
    }
}
