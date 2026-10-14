package cl.duoc.smartlogix.inventory.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.application.service.InventoryOrderEventService; // Servicio que aplica el descuento de stock
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedEvent; // El evento recibido
import tools.jackson.databind.ObjectMapper;                                   // Deserializa el cuerpo JSON (Jackson 3)
import jakarta.jms.JMSException;                                                    // Excepcion JMS
import jakarta.jms.Message;                                                         // Mensaje AMQP crudo
import lombok.RequiredArgsConstructor;      // constructor con los campos final
import lombok.extern.slf4j.Slf4j;            // logger
import org.springframework.jms.annotation.JmsListener; // ANOTACIÓN CLAVE: suscribe este método a AMQP 1.0
import org.springframework.stereotype.Component;        // bean de Spring
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCreatedConsumer {

    // El servicio de aplicación que procesa el evento (descarga stock, valida, evita duplicados).
    private final InventoryOrderEventService inventoryOrderEventService;
    private final ObjectMapper objectMapper;

    /**
     * Escucha la subscription inventory-sub del topico smartlogix.orders.topic.
     *
     * La subscription tiene un SqlFilter (eventType = 'order.created'), asi que Service
     * Bus ya descarto los eventos que no corresponden: inventory nunca ve order.cancelled.
     *
     * Semantica de ack (rúbrica 3.c): con sessionTransacted=false, Spring NO acusa el
     * mensaje mientras el listener corre. Si el metodo retorna bien, el mensaje se
     * completa (ACK). Si lanza excepcion, queda en PeekLock, el broker lo reentrega y
     * suma DeliveryCount; al agotar max-delivery-count=3 Service Bus lo mueve solo a
     * la DLQ de la subscription.
     */
    @JmsListener(destination = "${smartlogix.servicebus.inventory.subscription-destination}")
    public void consume(Message message) throws JMSException {
        OrderCreatedEvent event = null;
        try {
            event = deserialize(message);

            // 1) Log de entrada: confirma que el mensaje llegó a inventory.
            log.info(
                    "OrderCreatedEvent received in inventory orderId={} orderNumber={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber()
            );

            // 2) Delega la lógica de negocio al servicio de aplicación.
            inventoryOrderEventService.processOrderCreated(event);
        } catch (Exception exception) {
            // Al propagatear la excepción no se ACKea el mensaje: Service Bus lo reentrega
            // y, tras max-delivery-count, lo deriva a la DLQ de la subscription.
            log.warn(
                    "OrderCreatedEvent could not be processed in inventory orderId={} orderNumber={} reason={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber(),
                    exception.getMessage()
            );
            throw new RuntimeException(exception);
        }
    }

    /** Convierte el cuerpo AMQP (data section) en el evento de dominio. */
    private OrderCreatedEvent deserialize(Message message) throws JMSException {
        byte[] body = message.getBody(byte[].class);
        if (body == null || body.length == 0) {
            return null;
        }
        try {
            return objectMapper.readValue(body, OrderCreatedEvent.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("order.created payload is not valid JSON", e);
        }
    }
}