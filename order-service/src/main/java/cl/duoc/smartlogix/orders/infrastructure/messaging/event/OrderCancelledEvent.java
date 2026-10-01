package cl.duoc.smartlogix.orders.infrastructure.messaging.event;

// POJO que viaja por RabbitMQ cuando un pedido se CANCELA.
// Mismo patrón que OrderCreatedEvent: constructor vacío + getters/setters para Jackson.
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
public class OrderCancelledEvent {

    private Long orderId;            // ID del pedido cancelado
    private String orderNumber;      // "ORD-YYYYMMDD-XXXXX" (referencia humana)
    private Long customerId;         // Cliente que hizo el pedido
    private String reason;           // Motivo de la cancelación (p.ej. "Order cancelled")
    private LocalDateTime cancelledAt; // Momento de la cancelación
}