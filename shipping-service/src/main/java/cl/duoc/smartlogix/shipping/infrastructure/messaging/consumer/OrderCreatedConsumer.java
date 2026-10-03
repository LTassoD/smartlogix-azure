package cl.duoc.smartlogix.shipping.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.shipping.application.service.ShipmentService;                 // Servicio que crea el despacho
import cl.duoc.smartlogix.shipping.infrastructure.messaging.event.OrderCreatedEvent;     // El evento recibido
import jakarta.jms.JMSException;                                                        // Excepcion JMS
import jakarta.jms.Message;                                                             // Mensaje AMQP crudo
import lombok.RequiredArgsConstructor;      // constructor con los campos final
import lombok.extern.slf4j.Slf4j;            // logger
import org.springframework.jms.annotation.JmsListener; // ANOTACIÓN CLAVE: suscribe a AMQP 1.0
import org.springframework.stereotype.Component;        // bean de Spring
import tools.jackson.databind.ObjectMapper;           // Deserializa el cuerpo JSON (Jackson 3)

// Consumidor del evento "order.created": crea el despacho del pedido.
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCreatedConsumer {

    private final ShipmentService shipmentService;
    private final ObjectMapper objectMapper;

    /**
     * Escucha la subscription shipping-created-sub, cuyo SqlFilter es
     * (eventType = 'order.created'). Service Bus ya descarto las cancelaciones,
     * de modo que este listener nunca ve order.cancelled.
     *
     * Semantica de ack: con sessionTransacted=false el mensaje no se ACKea mientras
     * corre el listener. Si retorna bien, se completa; si lanza excepcion queda en
     * PeekLock, el broker lo reentrega y al agotar max-delivery-count=3 lo deriva
     * a la DLQ de esta subscription.
     */
    @JmsListener(destination = "${smartlogix.servicebus.shipping.created-subscription-destination}")
    public void consume(Message message) throws JMSException {
        OrderCreatedEvent event = null;
        try {
            event = deserialize(message);

            log.info(
                    "OrderCreatedEvent received in shipping orderId={} orderNumber={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber()
            );

            shipmentService.createFromOrderEvent(event);
        } catch (Exception exception) {
            log.warn(
                    "OrderCreatedEvent could not be processed in shipping orderId={} orderNumber={} reason={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber(),
                    exception.getMessage()
            );
            throw new RuntimeException(exception);
        }
    }

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