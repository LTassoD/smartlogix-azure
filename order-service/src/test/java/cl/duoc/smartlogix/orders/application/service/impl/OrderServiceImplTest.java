package cl.duoc.smartlogix.orders.application.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cl.duoc.smartlogix.orders.domain.enums.OrderStatus;
import cl.duoc.smartlogix.orders.infrastructure.messaging.publisher.OrderEventPublisher;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.CustomerEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.entity.OrderEntity;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.CustomerRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderRepository;
import cl.duoc.smartlogix.orders.infrastructure.persistence.repository.OrderStatusHistoryRepository;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateOrderItemRequest;
import cl.duoc.smartlogix.orders.presentation.dto.request.CreateOrderRequest;
import cl.duoc.smartlogix.orders.presentation.dto.response.OrderResponse;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Mock
    private OrderEventPublisher orderEventPublisher;

    @InjectMocks
    private OrderServiceImpl orderService;

    @Test
    void createCalculatesItemSubtotalAndOrderTotal() {
        CustomerEntity customer = CustomerEntity.builder()
                .fullName("Juan Perez")
                .email("juan.perez@demo.cl")
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        customer.setId(1L);

        CreateOrderRequest request = CreateOrderRequest.builder()
                .customerId(1L)
                .notes("Pedido demo")
                .items(List.of(CreateOrderItemRequest.builder()
                        .productId(1L)
                        .warehouseId(1L)
                        .sku("SKU-001")
                        .productName("Notebook Lenovo")
                        .unitPrice(BigDecimal.valueOf(650000))
                        .quantity(2)
                        .build()))
                .build();

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> {
            OrderEntity order = invocation.getArgument(0);
            order.setId(100L);
            order.setCreatedAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());
            order.getItems().forEach(item -> item.setId(200L));
            order.getHistory().forEach(history -> {
                history.setId(300L);
                history.setCreatedAt(LocalDateTime.now());
            });
            return order;
        });

        OrderResponse response = orderService.create(request);

        assertNotNull(response.getOrderNumber());
        assertTrue(response.getOrderNumber().startsWith("ORD-"));
        assertEquals(OrderStatus.CREATED, response.getStatus());
        assertEquals(0, BigDecimal.valueOf(1300000).compareTo(response.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(1300000).compareTo(response.getItems().getFirst().getSubtotal()));
        verifyNoInteractions(orderEventPublisher);
    }
}
