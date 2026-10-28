package cl.duoc.smartlogix.orders.infrastructure.messaging.publisher;

// --- Importaciones ---
import cl.duoc.smartlogix.orders.config.KafkaConfig;                               // Headers y constantes del dual publish
import cl.duoc.smartlogix.orders.config.ServiceBusConfig;                          // Destination del topic y propiedad eventType
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedEvent;   // DTO del evento de pedido creado
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCancelledEvent; // DTO del evento de pedido cancelado
import jakarta.jms.BytesMessage;                        // Cuerpo binario (JMS 3.1 no tiene Message.setObject)
import jakarta.jms.ConnectionFactory;                    // Fabrica de conexiones JMS
import java.nio.charset.StandardCharsets;                // Codificacion UTF-8 del cuerpo
import lombok.RequiredArgsConstructor;                   // Genera el constructor con los campos final
import lombok.extern.slf4j.Slf4j;                        // Da un logger (log.warn, log.info)
import org.apache.kafka.clients.producer.ProducerRecord; // Registro Kafka con key y headers
import org.springframework.beans.factory.annotation.Value; // Inyecta propiedades de application.properties
import org.springframework.jms.core.JmsTemplate;         // Cliente JMS de Spring para publicar
import org.springframework.jms.core.SessionCallback;     // Publicacion con control de la Session
import org.springframework.kafka.core.KafkaTemplate;     // Cliente Kafka de Spring (dual publish)
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
    private final KafkaTemplate<String, String> kafkaTemplate;

    /** Topic de Kafka para la capa de analitica (EP3). */
    @Value("${smartlogix.kafka.orders-topic:smartlogix.orders.events}")
    private String kafkaTopic;

    /** Kafka es opcional: si se desactiva, el publicador solo usa Service Bus. */
    @Value("${smartlogix.kafka.enabled:true}")
    private boolean kafkaEnabled;

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
        final byte[] body;
        try {
            body = objectMapper.writeValueAsBytes(payload);
        } catch (Exception exception) {
            // Si ni siquiera se puede serializar, no hay nada que publicar.
            log.warn("{} could not be serialized for orderNumber={} reason={}",
                    eventType, orderNumber, exception.getMessage());
            return;
        }

        publicarEnServiceBus(eventType, body, orderNumber);
        publicarEnKafka(eventType, body, orderNumber);
    }

    /**
     * Destino 1: Azure Service Bus (EP2, coreografia transaccional).
     *
     * Se construye el BytesMessage a mano porque JMS 3.1 elimino los setters de
     * Message (Message.setObject ya no existe): el cuerpo debe escribirse con
     * BytesMessage.writeBytes. El consumidor lo recupera con
     * message.getBody(byte[].class), que si sigue existiendo.
     */
    private void publicarEnServiceBus(String eventType, byte[] body, String orderNumber) {
        try {
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
            log.warn("{} could not be published to Service Bus for orderNumber={} reason={}",
                    eventType, orderNumber, exception.getMessage());
        }
    }

    /**
     * Destino 2: Apache Kafka (EP3, analitica en tiempo real) - DUAL PUBLISH.
     *
     * El mismo payload que viaja a Service Bus se publica en el topic de Kafka:
     *   - key   = orderNumber  -> todas las versiones de un pedido caen en la misma
     *                             particion y se procesan en orden.
     *   - header eventType     -> mismo valor que la propiedad JMS, para que el
     *                             consumidor filtre igual que con SqlFilter.
     *
     * Send es asincrono y falla de forma aislada: si Kafka no esta disponible el
     * pedido NO se ve afectado (solo se registra el warning). Kafka es un destino
     * de observabilidad, no parte de la transaccion.
     */
    private void publicarEnKafka(String eventType, byte[] body, String orderNumber) {
        if (!kafkaEnabled) {
            return;
        }
        try {
            ProducerRecord<String, String> record = new ProducerRecord<>(
                    kafkaTopic,
                    orderNumber,
                    new String(body, StandardCharsets.UTF_8));

            record.headers().add(KafkaConfig.EVENT_TYPE_HEADER,
                    eventType.getBytes(StandardCharsets.UTF_8));
            record.headers().add(KafkaConfig.ORDER_NUMBER_HEADER,
                    orderNumber.getBytes(StandardCharsets.UTF_8));
            record.headers().add(KafkaConfig.SOURCE_HEADER,
                    KafkaConfig.SOURCE_VALUE.getBytes(StandardCharsets.UTF_8));

            kafkaTemplate.send(record).whenComplete((resultado, error) -> {
                if (error != null) {
                    log.warn("{} could not be published to Kafka for orderNumber={} reason={}",
                            eventType, orderNumber, error.getMessage());
                } else if (resultado != null) {
                    var meta = resultado.getRecordMetadata();
                    log.info("{} -> Kafka topic={} partition={} offset={} key={}",
                            eventType, meta.topic(), meta.partition(), meta.offset(), orderNumber);
                }
            });
        } catch (Exception exception) {
            log.warn("{} could not be published to Kafka for orderNumber={} reason={}",
                    eventType, orderNumber, exception.getMessage());
        }
    }
}