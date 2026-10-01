package cl.duoc.smartlogix.orders.application.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import cl.duoc.smartlogix.orders.domain.enums.OrderStatus;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderItemEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderStatusHistoryEntity;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderResponse;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;

class OrderMapperTest {

    @Test
    void toResponseMapsOrderWithItemsAndHistory() {
        LocalDateTime now = LocalDateTime.now();
        CustomerEntity customer = CustomerEntity.builder()
                .fullName("Juan Perez")
                .email("juan.perez@demo.cl")
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        customer.setId(1L);

        OrderEntity order = OrderEntity.builder()
                .orderNumber("ORD-20260507-10001")
                .customer(customer)
                .status(OrderStatus.CREATED)
                .totalAmount(BigDecimal.valueOf(650000))
                .items(new ArrayList<>())
                .history(new ArrayList<>())
                .createdAt(now)
                .updatedAt(now)
                .build();
        order.setId(10L);

        OrderItemEntity item = OrderItemEntity.builder()
                .productId(1L)
                .warehouseId(1L)
                .sku("SKU-001")
                .productName("Notebook Lenovo")
                .unitPrice(BigDecimal.valueOf(650000))
                .quantity(1)
                .subtotal(BigDecimal.valueOf(650000))
                .build();
        item.setId(20L);
        order.addItem(item);

        OrderStatusHistoryEntity history = OrderStatusHistoryEntity.builder()
                .previousStatus(null)
                .newStatus(OrderStatus.CREATED)
                .comment("Order created")
                .createdAt(now)
                .build();
        history.setId(30L);
        order.addHistory(history);

        OrderResponse response = OrderMapper.toResponse(order);

        assertEquals(10L, response.getId());
        assertEquals("ORD-20260507-10001", response.getOrderNumber());
        assertEquals(OrderStatus.CREATED, response.getStatus());
        assertEquals(1, response.getItems().size());
        assertEquals(1, response.getHistory().size());
    }
}
