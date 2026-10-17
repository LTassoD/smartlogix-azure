package cl.duoc.smartlogix.inventory.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.ProductCreatedEvent; // El evento recibido
import tools.jackson.databind.ObjectMapper;                                   // Deserializa el cuerpo JSON (Jackson 3)
import jakarta.jms.JMSException;                                                    // Excepcion JMS
import jakarta.jms.Message;                                                         // Mensaje AMQP crudo
import lombok.RequiredArgsConstructor;      // constructor con los campos final
import lombok.extern.slf4j.Slf4j;            // logger
import org.springframework.jms.annotation.JmsListener; // Suscribe este método a AMQP 1.0
import org.springframework.stereotype.Component;        // bean de Spring

/**
 * Consumidor de AUDITORIA del topic de catalogo.
 *
 * inventory publica product.created en smartlogix.catalog.topic; esta subscription
 * (catalog-audit-sub) lo recibe y registra el alta en el log estructurado. Antes de
 * este cambio, crear un producto no emitia ningun mensaje y no quedaba registro de
 * mensajeria; ahora todo alta de producto deja una traza consumible y auditable.
 *
 * El SqlFilter de la subscription (eventType = 'product.created') descarta cualquier
 * otro evento del topic, de modo que este consumidor solo ve altas de producto.
 *
 * Semantica de ack: con sessionTransacted=false, si el metodo retorna bien el mensaje
 * se completa (ACK); si lanza excepcion queda en PeekLock, el broker lo reentrega y,
 * al agotar max-delivery-count, lo mueve a la DLQ de la subscription.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductCreatedConsumer {

    private final ObjectMapper objectMapper;

    @JmsListener(destination = "${smartlogix.servicebus.catalog.subscription-destination}")
    public void consume(Message message) throws JMSException {
        ProductCreatedEvent event = null;
        try {
            event = deserialize(message);

            log.info(
                    "[AUDIT] product.created received productId={} sku={} name={} unitPrice={}",
                    event == null ? null : event.getProductId(),
                    event == null ? null : event.getSku(),
                    event == null ? null : event.getName(),
                    event == null ? null : event.getUnitPrice()
            );
        } catch (Exception exception) {
            log.warn(
                    "product.created could not be processed by catalog audit productId={} reason={}",
                    event == null ? null : event.getProductId(),
                    exception.getMessage()
            );
            throw new RuntimeException(exception);
        }
    }

    /** Convierte el cuerpo AMQP (data section) en el evento de dominio. */
    private ProductCreatedEvent deserialize(Message message) throws JMSException {
        byte[] body = message.getBody(byte[].class);
        if (body == null || body.length == 0) {
            return null;
        }
        try {
            return objectMapper.readValue(body, ProductCreatedEvent.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("product.created payload is not valid JSON", e);
        }
    }
}
