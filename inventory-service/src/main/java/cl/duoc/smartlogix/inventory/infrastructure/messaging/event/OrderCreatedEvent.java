package cl.duoc.smartlogix.inventory.infrastructure.messaging.event;

// Mismo DTO que define el order-service, re-declarado en este microservicio.
// Al compartir el mismo nombre y campos, Jackson deserializa el JSON del evento
// en este POJO sin que inventory dependa del código de order-service.
import java.math.BigDecimal;      // Dinero con precisión exacta
import java.time.LocalDateTime;  // Fecha/hora del evento
import java.util.List;           // Lista de ítems
import lombok.AllArgsConstructor; // constructor con todos los campos
import lombok.Builder;            // patrón builder
import lombok.Getter;             // getters (Jackson los usa al deserializar)
import lombok.NoArgsConstructor;  // constructor vacío REQUERIDO por Jackson
import lombok.Setter;             // setters (Jackson los usa al deserializar)

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCreatedEvent {

    private Long orderId;                       // ID del pedido (viene en el mensaje)
    private String orderNumber;                 // "ORD-YYYYMMDD-XXXXX" usado como referencia para descuento de stock
    private Long customerId;                    // Cliente (no se usa directamente en inventory)
    private BigDecimal totalAmount;             // Total del pedido (información de contexto)
    private List<OrderCreatedItemEvent> items;  // Los ítems → cada uno generará un movimiento de stock
    private LocalDateTime createdAt;            // Fecha del evento
}