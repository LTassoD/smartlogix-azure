package cl.duoc.smartlogix.inventory.infrastructure.messaging.publisher;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.config.ServiceBusConfig;                              // Destination del topic y property eventType
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.ProductCreatedEvent;   // DTO del evento de producto creado
import jakarta.jms.BytesMessage;                        // Cuerpo binario (JMS 3.1 no tiene Message.setObject)
import jakarta.jms.Session;                             // Session para construir el mensaje
import lombok.RequiredArgsConstructor;                   // Genera el constructor con los campos final
import lombok.extern.slf4j.Slf4j;                        // Da un logger (log.warn, log.info)
import org.springframework.jms.core.JmsTemplate;         // Cliente JMS de Spring para publicar
import org.springframework.jms.core.SessionCallback;     // Publicacion con control de la Session
import org.springframework.stereotype.Component;           // Registra esta clase como bean de Spring
import tools.jackson.databind.ObjectMapper;              // Serializa el evento a JSON (Jackson 3)

// Publicador de los eventos de catalogo hacia Azure Service Bus.
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductEventPublisher {

    /** Valor de la property eventType que filtra la subscription de auditoria. */
    private static final String PRODUCT_CREATED = "product.created";

    private final JmsTemplate jmsTemplate;
    private final ObjectMapper objectMapper;
    private final ServiceBusConfig serviceBusConfig;

    /**
     * Publica el evento de producto creado hacia el topic smartlogix.catalog.topic.
     *
     * Igual que order-service con order.created: el topic NO enruta por routing key
     * como en RabbitMQ; cada subscription decide con un SqlFilter sobre la PROPIEDAD
     * eventType. Por eso hay que setear explicitamente eventType='product.created';
     * si se omite, ninguna regla coincide y la subscription de auditoria no recibe nada.
     */
    public void publishProductCreated(ProductCreatedEvent event) {
        try {
            byte[] body = objectMapper.writeValueAsBytes(event);

            jmsTemplate.execute(new SessionCallback<>() {
                @Override
                public Object doInJms(Session session) throws jakarta.jms.JMSException {
                    var destination = session.createTopic(serviceBusConfig.catalogTopicDestination());

                    try (var producer = session.createProducer(destination)) {
                        BytesMessage message = session.createBytesMessage();
                        message.writeBytes(body);
                        message.setStringProperty(ServiceBusConfig.EVENT_TYPE_PROPERTY, PRODUCT_CREATED);
                        message.setStringProperty("productId", String.valueOf(event.getProductId()));
                        message.setStringProperty("sku", event.getSku());
                        producer.send(message);
                    }
                    return null;
                }
            });
        } catch (Exception exception) {
            // Un fallo del broker NO revienta el alta del producto: se registra y la
            // operacion sigue su curso, con el mismo criterio de resiliencia que order-service.
            log.warn("product.created could not be published for productId={} sku={} reason={}",
                    event.getProductId(), event.getSku(), exception.getMessage());
        }
    }
}
