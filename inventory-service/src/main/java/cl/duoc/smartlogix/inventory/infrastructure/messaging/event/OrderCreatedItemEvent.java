package cl.duoc.smartlogix.inventory.infrastructure.messaging.event;

// Ítem del evento en inventory-service. Mismos campos que en order-service.
// Solo necesita los datos para descontar stock: productId, warehouseId, quantity.
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

    private Long productId;       // Qué producto (se usa para buscar el stock)
    private Long warehouseId;     // En qué bodega descontar
    private String sku;           // Código del producto (contexto/trazabilidad)
    private String productName;   // Nombre (contexto, no se usa para el descuento)
    private Integer quantity;     // Cuántas unidades descontar
    private BigDecimal unitPrice; // Precio unitario (contexto, sin uso operativo aquí)
}