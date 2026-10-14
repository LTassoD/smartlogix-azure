package cl.duoc.smartlogix.orders.infrastructure.messaging.publisher;

// --- Importaciones ---
import cl.duoc.smartlogix.orders.config.ServiceBusConfig;                          // Destination del topic y propiedad eventType
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedEvent;   // DTO del evento de pedido creado
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCancelledEvent; // DTO del evento de pedido cancelado
import jakarta.jms.BytesMessage;                        // Cuerpo binario (JMS 3.1 no tiene Message.setObject)
import jakarta.jms.ConnectionFactory;                    // Fabrica de conexiones JMS
import lombok.RequiredArgsConstructor;                   // Genera el constructor con los campos final
import lombok.extern.slf4j.Slf4j;                        // Da un logger (log.warn, log.info)
import org.springframework.jms.core.JmsTemplate;         // Cliente JMS de Spring para publicar
import org.springframework.jms.core.SessionCallback;     // Publicacion con control de la Session
import org.springframework.stereotype.Component;           // Registra esta clase como bean de Spring
import tools.jackson.databind.ObjectMapper;              // Serializa el evento a JSON (Jackson 3)

// Publicador de los eventos de pedido hacia Azure Service Bus.
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    /** Valores de la propiedad eventType; replican las routing keys de RabbitMQ. */
    private static final String ORDER_CREATED = "order.created";
    private static final String ORDER_CANCELLED = "order.cancelled";

    private final JmsTemplate jmsTemplate;
    private final ObjectMapper objectMapper;
    private final ServiceBusConfig serviceBusConfig;

    /**
     * Publica el evento de pedido confirmado.
     *
     * CAMBIO CLAVE RESPECTO A RABBITMQ: en AMQP 0-9-1 el tipo de evento viajaba en
     * la routing key y el exchange ruteaba por ella. En Service Bus el topic no
     * enruta: TODAS las subscriptions reciben el mensaje y cada una decide con un
     * SqlFilter sobre la PROPIEDAD eventType. Por eso el publicador DEBE setear esa
     * propiedad explicitamente; si se omite, ningun filtro coincide y las
     * subscriptions de inventory y shipping no reciben nada.
     */
    public void publishOrderCreated(OrderCreatedEvent event) {
        publish(ORDER_CREATED, event, event.getOrderNumber());
    }

    // El filtrado selectivo que en RabbitMQ hacia la routing key "order.cancelled"
    // ahora lo hace el SqlFilter de cada subscription: inventory-sub solo acepta
    // order.created y shipping-cancelled-sub solo order.cancelled.
    public void publishOrderCancelled(OrderCancelledEvent event) {
        publish(ORDER_CANCELLED, event, event.getOrderNumber());
    }

    /**
     * Publica usando un SessionCallback en vez de convertAndSend.
     *
     * Se construye el BytesMessage a mano porque JMS 3.1 elimino los setters de
     * Message (Message.setObject ya no existe): el cuerpo debe escribirse con
     * BytesMessage.writeBytes. El consumidor lo recupera con
     * message.getBody(byte[].class), que si sigue existiendo.
     */
    private void publish(String eventType, Object payload, String orderNumber) {
        try {
            byte[] body = objectMapper.writeValueAsBytes(payload);

            jmsTemplate.execute(new SessionCallback<>() {
                @Override
                public Object doInJms(jakarta.jms.Session session) throws jakarta.jms.JMSException {
                    var destination = session.createTopic(serviceBusConfig.ordersTopicDestination());

                    try (var producer = session.createProducer(destination)) {
                        BytesMessage message = session.createBytesMessage();
                        message.writeBytes(body);
                        message.setStringProperty(ServiceBusConfig.EVENT_TYPE_PROPERTY, eventType);
                        message.setStringProperty("orderNumber", orderNumber);
                        producer.send(message);
                    }
                    return null;
                }
            });
        } catch (Exception exception) {
            // Un fallo del broker NO revienta la transaccion del pedido: se registra
            // y el pedido sigue su curso. Mismo criterio de resiliencia que la
            // version con RabbitMQ.
            log.warn("{} could not be published for orderNumber={} reason={}",
                    eventType, orderNumber, exception.getMessage());
        }
    }
}