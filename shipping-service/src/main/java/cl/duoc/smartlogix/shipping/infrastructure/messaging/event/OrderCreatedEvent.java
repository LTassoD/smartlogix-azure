package cl.duoc.smartlogix.shipping.infrastructure.messaging.event;

// Mismo DTO compartido, re-declarado en shipping-service.
// la información mínima para crear el despacho: orderId, orderNumber, customerId.
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
public class OrderCreatedEvent {

    private Long orderId;                       // ID del pedido → se asocia al despacho (unique)
    private String orderNumber;                 // "ORD-..." → número de referencia del despacho
    private Long customerId;                    // Cliente al que va el envío
    private BigDecimal totalAmount;             // Total (contexto)
    private List<OrderCreatedItemEvent> items;  // ítems → descripción del contenido del envío
    private LocalDateTime createdAt;            // Fecha del evento
}