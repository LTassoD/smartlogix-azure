package cl.duoc.smartlogix.orders.presentation.dto.response;

import cl.duoc.smartlogix.orders.domain.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    private Long id;
    private String orderNumber;
    private CustomerResponse customer;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String notes;
    private List<OrderItemResponse> items;
    private List<OrderStatusHistoryResponse> history;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
