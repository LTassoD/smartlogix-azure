package cl.duoc.smartlogix.orders.infrastructure.messaging.event;

// --- Importaciones ---
import java.math.BigDecimal;   // Números decimales de alta precisión (dinero)
import java.time.LocalDateTime; // Fecha y hora sin zona horaria
import java.util.List;         // Lista de ítems del pedido
import lombok.AllArgsConstructor; // genera constructor con TODOS los campos
import lombok.Builder;          // patrón builder: OrderCreatedEvent.builder()...
import lombok.Getter;           // genera los getters
import lombok.NoArgsConstructor; // genera constructor vacío (necesario para Jackson)
import lombok.Setter;           // genera los setters

// POJO que viaja como JSON por RabbitMQ.
// IMPORTANTE: debe tener constructor vacío + getters/setters para que Jackson
// pueda deserializarlo al otro lado (inventory/shipping). Por eso @NoArgsConstructor.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCreatedEvent {

    private Long orderId;              // ID interno del pedido en order-service
    private String orderNumber;        // Código legible "ORD-YYYYMMDD-XXXXX"
    private Long customerId;           // Cliente que hizo el pedido
    private BigDecimal totalAmount;    // Total del pedido en dinero
    private List<OrderCreatedItemEvent> items; // Los productos del pedido (líneas)
    private LocalDateTime createdAt;   // Momento en que se generó el evento
}