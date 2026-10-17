package cl.duoc.smartlogix.inventory.infrastructure.messaging.event;

// Evento publicado por inventory cuando se crea un producto (catalogo).
// Antes, crear un producto era una operacion puramente sincrona (HTTP) y no dejaba
// rastro en la mensajeria; este evento cierra esa brecha publicando product.created
// hacia el topic smartlogix.catalog.topic, consumido por la subscription de auditoria.
import java.math.BigDecimal;      // Precio unitario con precision exacta
import java.time.LocalDateTime;  // Fecha/hora del evento
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
public class ProductCreatedEvent {

    private Long productId;          // ID del producto creado
    private String sku;              // SKU (identifica el producto en el catalogo)
    private String name;             // Nombre del producto
    private BigDecimal unitPrice;    // Precio unitario de referencia
    private LocalDateTime createdAt; // Fecha/hora del alta
}
