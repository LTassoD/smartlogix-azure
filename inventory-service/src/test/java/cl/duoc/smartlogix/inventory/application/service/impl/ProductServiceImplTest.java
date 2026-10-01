package cl.duoc.smartlogix.inventory.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.inventory.domain.exception.DuplicateResourceException;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.entity.ProductEntity;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.ProductRepository;
import cl.duoc.smartlogix.inventory.presentation.dto.request.CreateProductRequest;
import cl.duoc.smartlogix.inventory.presentation.dto.response.ProductResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    private ProductServiceImpl productService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        productService = new ProductServiceImpl(productRepository);
    }

    @Test
    void shouldCreateProductWhenSkuDoesNotExist() {
        CreateProductRequest request = CreateProductRequest.builder()
                .sku("SKU-200")
                .name("Dock USB-C")
                .description("Docking station")
                .unitPrice(BigDecimal.valueOf(45000))
                .build();

        ProductEntity savedProduct = ProductEntity.builder()
                .id(1L)
                .sku("SKU-200")
                .name("Dock USB-C")
                .description("Docking station")
                .unitPrice(BigDecimal.valueOf(45000))
                .active(true)
                .build();

        when(productRepository.existsBySku("SKU-200")).thenReturn(false);
        when(productRepository.save(any(ProductEntity.class))).thenReturn(savedProduct);

        ProductResponse response = productService.create(request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getSku()).isEqualTo("SKU-200");
        verify(productRepository).save(any(ProductEntity.class));
    }

    @Test
    void shouldRejectDuplicatedSku() {
        CreateProductRequest request = CreateProductRequest.builder()
                .sku("SKU-200")
                .name("Dock USB-C")
                .unitPrice(BigDecimal.valueOf(45000))
                .build();

        when(productRepository.existsBySku("SKU-200")).thenReturn(true);

        assertThatThrownBy(() -> productService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("SKU-200");
    }
}
