package cl.duoc.smartlogix.shipping.infrastructure.messaging.event;

// Ítem del evento en shipping-service. Se usa mayormente como contexto:
// nombre/producto/cantidad pueden servir para documentar el contenido del envío.
import java.math.BigDecimal;
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
public class OrderCreatedItemEvent {

    private Long productId;       // ID del producto (contexto)
    private Long warehouseId;     // Bodega origen (contexto logístico)
    private String sku;           // Código del producto
    private String productName;   // Nombre del producto (se incluye como referencia del contenido)
    private Integer quantity;     // Cantidad despachada
    private BigDecimal unitPrice; // Precio unitario (contexto)
}