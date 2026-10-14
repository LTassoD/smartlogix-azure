package cl.duoc.smartlogix.orders.infrastructure.messaging.event;

// Importaciones
import java.math.BigDecimal;      // Dinero con precisión exacta
import lombok.AllArgsConstructor; // constructor con todos los campos
import lombok.Builder;            // patrón builder
import lombok.Getter;             // getters
import lombok.NoArgsConstructor;  // constructor vacío (Jackson lo necesita)
import lombok.Setter;             // setters

// Ítem individual dentro del evento OrderCreatedEvent.
// Representa UNA línea del pedido (un producto con su cantidad y precio).
// Debe poseer los mismos campos en ambos lados para la serialización JSON.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCreatedItemEvent {

    private Long productId;       // ID del producto en inventory-service
    private Long warehouseId;     // Bodega de origen del producto
    private String sku;           // Código de inventario del producto
    private String productName;   // Nombre comercial (para el despacho/tracking)
    private Integer quantity;     // Cantidad solicitada
    private BigDecimal unitPrice; // Precio unitario en el momento del pedido
}