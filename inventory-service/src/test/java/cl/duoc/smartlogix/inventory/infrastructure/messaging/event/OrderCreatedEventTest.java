package cl.duoc.smartlogix.inventory.infrastructure.messaging.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class OrderCreatedEventTest {

    @Test
    void shouldBuildOrderCreatedEvent() {
        OrderCreatedItemEvent item = OrderCreatedItemEvent.builder()
                .productId(1L)
                .warehouseId(1L)
                .sku("SKU-001")
                .productName("Notebook Lenovo")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(650000))
                .build();

        OrderCreatedEvent event = OrderCreatedEvent.builder()
                .orderId(10L)
                .orderNumber("ORD-20260507-10001")
                .customerId(1L)
                .totalAmount(BigDecimal.valueOf(650000))
                .items(List.of(item))
                .createdAt(LocalDateTime.now())
                .build();

        assertThat(event.getOrderId()).isEqualTo(10L);
        assertThat(event.getOrderNumber()).isEqualTo("ORD-20260507-10001");
        assertThat(event.getItems()).hasSize(1);
        assertThat(event.getItems().getFirst().getSku()).isEqualTo("SKU-001");
    }
}
