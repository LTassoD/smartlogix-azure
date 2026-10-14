package cl.duoc.smartlogix.shipping.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.shipping.application.service.ShipmentService;               // Servicio que cancela el despacho
import cl.duoc.smartlogix.shipping.infrastructure.messaging.event.OrderCancelledEvent; // El evento recibido
import jakarta.jms.JMSException;                                                       // Excepcion JMS
import jakarta.jms.Message;                                                            // Mensaje AMQP crudo
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jms.annotation.JmsListener; // Suscribe a la subscription
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;          // Deserializa el cuerpo JSON (Jackson 3)

// Consumidor del evento "order.cancelled".
//
// En RabbitMQ la routing key "order.cancelled" lo separaba del flujo de confirmacion
// porque cada flujo tenia su propia cola. Aqui el aislamiento lo hace el SqlFilter de
// shipping-cancelled-sub: Service Bus nunca entrega cancelaciones a este listener si
// no corresponde, y nunca entrega order.created a la subscription de cancelaciones.
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCancelledConsumer {

    private final ShipmentService shipmentService;
    private final ObjectMapper objectMapper;

    // @JmsListener sobre la subscription de cancelaciones.
    @JmsListener(destination = "${smartlogix.servicebus.shipping.cancelled-subscription-destination}")
    public void consume(Message message) throws JMSException {
        OrderCancelledEvent event = null;
        try {
            event = deserialize(message);

            log.info(
                    "OrderCancelledEvent received orderId={} orderNumber={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber()
            );

            // Cancela el despacho asociado al pedido (si existe).
            shipmentService.cancelByOrderId(event.getOrderId());
        } catch (Exception exception) {
            // Al propagatear no se ACKea: Service Bus reentrega y, tras max-delivery-count,
            // deriva el mensaje a la DLQ de shipping-cancelled-sub (auditoria).
            log.warn(
                    "OrderCancelledEvent could not be processed orderId={} orderNumber={} reason={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber(),
                    exception.getMessage()
            );
            throw new RuntimeException(exception);
        }
    }

    private OrderCancelledEvent deserialize(Message message) throws JMSException {
        byte[] body = message.getBody(byte[].class);
        if (body == null || body.length == 0) {
            return null;
        }
        try {
            return objectMapper.readValue(body, OrderCancelledEvent.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("order.cancelled payload is not valid JSON", e);
        }
    }
}