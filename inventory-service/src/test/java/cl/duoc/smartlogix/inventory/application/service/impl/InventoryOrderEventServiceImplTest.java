package cl.duoc.smartlogix.inventory.application.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.inventory.application.service.StockService;
import cl.duoc.smartlogix.inventory.domain.enums.StockMovementType;
import cl.duoc.smartlogix.inventory.domain.exception.BusinessRuleException;
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedEvent;
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedItemEvent;
import cl.duoc.smartlogix.inventory.infrastructure.persistence.repository.StockMovementRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class InventoryOrderEventServiceImplTest {

    @Mock
    private StockService stockService;

    @Mock
    private StockMovementRepository stockMovementRepository;

    private InventoryOrderEventServiceImpl inventoryOrderEventService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        inventoryOrderEventService = new InventoryOrderEventServiceImpl(stockService, stockMovementRepository);
    }

    @Test
    void shouldProcessValidEventAndCreateOrderOutMovement() {
        OrderCreatedEvent event = validEvent();

        when(stockMovementRepository.existsByReferenceCodeAndProductIdAndWarehouseIdAndType(
                "ORD-20260507-10001",
                1L,
                1L,
                StockMovementType.ORDER_OUT
        )).thenReturn(false);

        inventoryOrderEventService.processOrderCreated(event);

        verify(stockService).createOrderOutMovement(
                1L,
                1L,
                1,
                "Stock descontado por pedido confirmado",
                "ORD-20260507-10001"
        );
    }

    @Test
    void shouldSkipItemWhenOrderOutMovementAlreadyExists() {
        OrderCreatedEvent event = validEvent();

        when(stockMovementRepository.existsByReferenceCodeAndProductIdAndWarehouseIdAndType(
                "ORD-20260507-10001",
                1L,
                1L,
                StockMovementType.ORDER_OUT
        )).thenReturn(true);

        inventoryOrderEventService.processOrderCreated(event);

        verify(stockService, never()).createOrderOutMovement(
                1L,
                1L,
                1,
                "Stock descontado por pedido confirmado",
                "ORD-20260507-10001"
        );
    }

    @Test
    void shouldPropagateBusinessErrorWhenStockIsInsufficient() {
        OrderCreatedEvent event = validEvent();

        when(stockMovementRepository.existsByReferenceCodeAndProductIdAndWarehouseIdAndType(
                "ORD-20260507-10001",
                1L,
                1L,
                StockMovementType.ORDER_OUT
        )).thenReturn(false);
        doThrow(new BusinessRuleException("Stock cannot be negative"))
                .when(stockService)
                .createOrderOutMovement(
                        1L,
                        1L,
                        1,
                        "Stock descontado por pedido confirmado",
                        "ORD-20260507-10001"
                );

        assertThatThrownBy(() -> inventoryOrderEventService.processOrderCreated(event))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Stock cannot be negative");
    }

    private OrderCreatedEvent validEvent() {
        return OrderCreatedEvent.builder()
                .orderId(10L)
                .orderNumber("ORD-20260507-10001")
                .customerId(1L)
                .totalAmount(BigDecimal.valueOf(650000))
                .items(List.of(OrderCreatedItemEvent.builder()
                        .productId(1L)
                        .warehouseId(1L)
                        .sku("SKU-001")
                        .productName("Notebook Lenovo")
                        .quantity(1)
                        .unitPrice(BigDecimal.valueOf(650000))
                        .build()))
                .createdAt(LocalDateTime.now())
                .build();
    }
}
