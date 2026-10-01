package cl.duoc.smartlogix.inventory.application.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.ProductEntity;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateProductRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.ProductResponse;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class ProductMapperTest {

    @Test
    void shouldMapCreateRequestToEntity() {
        CreateProductRequest request = CreateProductRequest.builder()
                .sku("SKU-100")
                .name("Monitor LG")
                .description("Monitor demo")
                .unitPrice(BigDecimal.valueOf(120000))
                .build();

        ProductEntity entity = ProductMapper.toEntity(request);

        assertThat(entity.getSku()).isEqualTo("SKU-100");
        assertThat(entity.getName()).isEqualTo("Monitor LG");
        assertThat(entity.getDescription()).isEqualTo("Monitor demo");
        assertThat(entity.getUnitPrice()).isEqualByComparingTo("120000");
        assertThat(entity.getActive()).isTrue();
    }

    @Test
    void shouldMapEntityToResponse() {
        LocalDateTime now = LocalDateTime.now();
        ProductEntity entity = ProductEntity.builder()
                .id(1L)
                .sku("SKU-100")
                .name("Monitor LG")
                .description("Monitor demo")
                .unitPrice(BigDecimal.valueOf(120000))
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        ProductResponse response = ProductMapper.toResponse(entity);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getSku()).isEqualTo("SKU-100");
        assertThat(response.getName()).isEqualTo("Monitor LG");
        assertThat(response.getUnitPrice()).isEqualByComparingTo("120000");
    }
}
