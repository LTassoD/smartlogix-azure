package cl.duoc.smartlogix.shipping.infrastructure.messaging.event;

// Evento de CANCELACIÓN, re-declarado en shipping-service (mismos campos que order-service).
// Información mínima para cancelar el despacho asociado: orderId y orderNumber.
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

    private Long orderId;              // ID del pedido cancelado → se usa para buscar el despacho a cancelar
    private String orderNumber;        // "ORD-..." → referencia del pedido en el log
    private Long customerId;           // Cliente (contexto)
    private String reason;             // Motivo de la cancelación
    private LocalDateTime cancelledAt; // Fecha/hora de la cancelación
}