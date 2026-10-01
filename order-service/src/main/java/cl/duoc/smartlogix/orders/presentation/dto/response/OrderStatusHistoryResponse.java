package cl.duoc.smartlogix.orders.presentation.dto.response;

import cl.duoc.smartlogix.orders.domain.enums.OrderStatus;
import java.time.LocalDateTime;
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
public class OrderStatusHistoryResponse {

    private Long id;
    private OrderStatus previousStatus;
    private OrderStatus newStatus;
    private String comment;
    private LocalDateTime createdAt;
}
