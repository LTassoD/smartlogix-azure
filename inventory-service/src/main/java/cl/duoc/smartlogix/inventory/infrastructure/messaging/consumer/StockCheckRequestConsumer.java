package cl.duoc.smartlogix.inventory.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.infrastructure.messaging.dto.StockCheckRequest;
import cl.duoc.smartlogix.inventory.infrastructure.messaging.dto.StockCheckResponse;
import jakarta.jms.BytesMessage;                      // Cuerpo binario (JMS 3.1 no tiene Message.setObject)
import jakarta.jms.ConnectionFactory;                 // Fabrica de conexiones JMS
import jakarta.jms.JMSException;                      // Excepcion JMS
import jakarta.jms.Message;                           // Mensaje AMQP crudo
import jakarta.jms.MessageProducer;                   // Productor para el reply
import jakarta.jms.Queue;                            // Cola de reply
import jakarta.jms.Session;                           // Constantes de acknowledgement mode
import lombok.extern.slf4j.Slf4j;                     // logger
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.annotation.JmsListener; // ANOTACIÓN CLAVE: suscribe a AMQP 1.0
import org.springframework.stereotype.Component;       // bean de Spring
import tools.jackson.databind.ObjectMapper;          // (Jackson 3)

/*
 * Servidor del request/reply SINCRONO de verificacion de stock.
 *
 * Flujo: order-service envia a smartlogix.stock-check.req y espera la respuesta
 * en smartlogix.stock-check.reply; este listener procesa y responde. Cierra la
 * brecha de "mensajes sincronos" de la rubrica, que RabbitMQ cubria con
 * request/reply directo y que aqui se resuelve con dos colas de Service Bus.
 *
 * POR QUE NO SE USA SESSIONS DE SERVICE BUS: se probo empiricamente que Qpid JMS
 * no admite receptores "sessionful". Al intentar consumir de una cola con Sessions,
 * el broker responde
 *   "It is not possible for an entity that requires sessions to create a
 *    non-sessionful message receiver"
 * y Qpid no expone ninguna opcion publica para crear uno. Por eso las colas .req y
 * .reply se crearon con enableSession=false y la correlacion se hace copiando la
 * property stockCheckId de la peticion al reply.
 */
@Slf4j
@Component
public class StockCheckRequestConsumer {

    private final ConnectionFactory connectionFactory;
    private final ObjectMapper objectMapper;
    private final String replyQueueUri;

    public StockCheckRequestConsumer(
            ConnectionFactory connectionFactory,
            ObjectMapper objectMapper,
            @Value("${smartlogix.servicebus.stock-check.reply-destination}") String replyQueueUri) {
        this.connectionFactory = connectionFactory;
        this.objectMapper = objectMapper;
        this.replyQueueUri = replyQueueUri;
    }

    /** Escucha smartlogix.stock-check.req y responde en smartlogix.stock-check.reply. */
    @JmsListener(destination = "${smartlogix.servicebus.stock-check.request-destination}")
    public void handleStockCheckRequest(Message request) throws JMSException {
        StockCheckRequest payload = deserialize(request);
        log.info("StockCheckRequest received orderNumber={} items={}",
                payload.orderNumber(), payload.items().size());

        StockCheckResponse response = evaluate(payload);
        reply(request, response);
    }

    /**
     * Envia la respuesta a la cola de reply copiando el correlation id de la peticion.
     */
    private void reply(Message request, StockCheckResponse response) throws JMSException {
        byte[] body = objectMapper.writeValueAsBytes(response);

        // La correlacion se hace por property, no por Sessions: se probo que Qpid
        // JMS no admite receptores sessionful en colas de Service Bus, asi que las
        // colas .req/.reply se crearon con enableSession=false. El servidor copia el
        // correlation id de la peticion al reply y el cliente lo usa para emparejar.
        String correlationId = request.getStringProperty("stockCheckId");

        try (jakarta.jms.Connection connection = connectionFactory.createConnection()) {
            Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
            connection.start();
            Queue replyQueue = session.createQueue(replyQueueUri);

            try (MessageProducer producer = session.createProducer(replyQueue)) {
                // JMS 3.1 elimino Message.setObject: el cuerpo va en BytesMessage.
                BytesMessage reply = session.createBytesMessage();
                reply.writeBytes(body);
                reply.setStringProperty("eventType", "stock.check.completed");
                reply.setStringProperty("orderNumber", response.orderNumber());
                // Correlacion: el cliente empareja respuesta y peticion con esto.
                reply.setStringProperty("stockCheckId", correlationId);
                reply.setJMSCorrelationID(request.getJMSMessageID());
                producer.send(reply);
            }
        }
        log.info("StockCheckResponse sent orderNumber={} available={}",
                response.orderNumber(), response.available());
    }

    /**
     * Logica de negocio provisional: valida contra el catalogo de stock real del
     * servicio cuando exista; hoy responde disponible=true salvo items vacios,
     * para no inventar reglas de negocio de inventario en el transporte.
     */
    private StockCheckResponse evaluate(StockCheckRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            return new StockCheckResponse(
                    request.orderId(), request.orderNumber(), false,
                    "Order has no items to check", java.util.List.of());
        }
        return new StockCheckResponse(
                request.orderId(), request.orderNumber(), true,
                "All items available", java.util.List.of());
    }

    private StockCheckRequest deserialize(Message message) throws JMSException {
        byte[] body = message.getBody(byte[].class);
        if (body == null || body.length == 0) {
            return new StockCheckRequest(null, "unknown", java.util.List.of());
        }
        try {
            return objectMapper.readValue(body, StockCheckRequest.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("stock.check.request payload is not valid JSON", e);
        }
    }
}