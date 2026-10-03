package cl.duoc.smartlogix.orders.infrastructure.messaging.client;

// --- Importaciones ---
import cl.duoc.smartlogix.orders.config.ServiceBusConfig;                       // URIs de las colas request/reply
import cl.duoc.smartlogix.orders.infrastructure.messaging.dto.StockCheckRequest;  // Peticion
import cl.duoc.smartlogix.orders.infrastructure.messaging.dto.StockCheckResponse; // Respuesta
import jakarta.jms.BytesMessage;                          // Cuerpo binario (JMS 3.1 no tiene Message.setObject)
import jakarta.jms.Connection;                            // Conexion JMS clasica
import jakarta.jms.ConnectionFactory;                     // Fabrica de conexiones JMS
import jakarta.jms.JMSException;                          // Excepcion JMS
import jakarta.jms.Message;                               // Mensaje AMQP
import jakarta.jms.MessageConsumer;                       // Consumidor de la cola de reply
import jakarta.jms.MessageProducer;                       // Productor hacia la cola de request
import jakarta.jms.Queue;                                // Cola
import jakarta.jms.QueueSession;                          // Session con soporte de JMSXGroupID
import jakarta.jms.Session;                              // Constantes de acknowledgement mode
import lombok.extern.slf4j.Slf4j;                         // logger
import org.springframework.beans.factory.annotation.Value; // Inyecta la property del timeout
import org.springframework.stereotype.Component;           // bean de Spring
import tools.jackson.databind.ObjectMapper;              // Serializa/Deserializa (Jackson 3)

/**
 * Cliente del request/reply SINCRONO de verificacion de stock.
 *
 * Cierra la brecha de "mensajes sincronos" de la rubrica: al CONFIRMAR un pedido,
 * order-service consulta a inventory-service y ESPERA la respuesta antes de seguir.
 * Es el equivalente de RabbitMQ convertSendAndReceive, implementado con las dos
 * colas de Service Bus (smartlogix.stock-check.req / .reply).
 *
 * POR QUE NO SE USA convertAndReceive: la cola de reply tiene SESSIONS habilitadas y
 * AMQP 1.0 exige la propiedad JMSXGroupID al enviar a una cola con Sessions.
 * convertAndReceive no permite fijarla, por lo que el broker rechazaria el envio.
 * La implementacion abre la sesion como QueueSession, fija JMSXGroupID y consume el
 * reply correlacionado.
 *
 * Sin respuesta el metodo devuelve available=false tras agotar el timeout, de modo
 * que una caida del broker de inventario ni deja el pedido colgado ni revienta la
 * transaccion.
 */
@Slf4j
@Component
public class StockCheckClient {

    /** Propiedad que AMQP 1.0 exige para enviar a colas con Sessions habilitadas. */
    private static final String SESSION_ID_PROPERTY = "JMSXGroupID";

    /** Property propia para correlacionar la respuesta con su peticion. */
    private static final String CORRELATION_PROPERTY = "stockCheckId";

    private final ConnectionFactory connectionFactory;
    private final ObjectMapper objectMapper;
    private final ServiceBusConfig serviceBusConfig;
    private final long timeoutMillis;

    public StockCheckClient(
            ConnectionFactory connectionFactory,
            ObjectMapper objectMapper,
            ServiceBusConfig serviceBusConfig,
            @Value("${smartlogix.servicebus.stock-check.timeout-ms:10000}") long timeoutMillis) {
        this.connectionFactory = connectionFactory;
        this.objectMapper = objectMapper;
        this.serviceBusConfig = serviceBusConfig;
        this.timeoutMillis = timeoutMillis;
    }

    /**
     * Envia la peticion a .req y espera el reply en .reply.
     *
     * El session id agrupa la conversacion: Service Bus solo entrega el reply a la
     * sesion que emitio la peticion, asi que se usa uno unico por llamada.
     */
    public StockCheckResponse checkStock(
            Long orderId,
            String orderNumber,
            java.util.List<StockCheckRequest.Item> items) {

        String sessionId = "stock-check-" + orderNumber + "-" + System.nanoTime();
        try {
            byte[] body = objectMapper.writeValueAsBytes(new StockCheckRequest(orderId, orderNumber, items));

            // Se usa la API clasica Connection + QueueSession y no JMSContext: la
            // correlacion de Service Bus exige una QueueSession (session id AMQP) y
            // JMSContext no expone sessions, solo la API simplificada.
            try (Connection connection = connectionFactory.createConnection()) {
                QueueSession session = (QueueSession) connection.createSession(
                        false, Session.AUTO_ACKNOWLEDGE);
                connection.start();

                Queue requestQueue = session.createQueue(serviceBusConfig.stockCheckRequestQueue());
                Queue replyQueue = session.createQueue(serviceBusConfig.stockCheckReplyQueue());

                try (MessageConsumer replyConsumer = session.createConsumer(replyQueue);
                     MessageProducer producer = session.createProducer(requestQueue)) {

                    // JMS 3.1 elimino Message.setObject: el cuerpo se escribe con
                    // BytesMessage y el receptor lo lee con getBody(byte[].class).
                    BytesMessage request = session.createBytesMessage();
                    request.writeBytes(body);
                    request.setStringProperty(SESSION_ID_PROPERTY, sessionId);
                    request.setStringProperty(CORRELATION_PROPERTY, sessionId);
                    request.setStringProperty("orderNumber", orderNumber);

                    // El consumidor del reply se crea ANTES del envio: si se enviara
                    // primero, el reply podria llegar antes de que exista el consumidor.
                    producer.send(request);

                    Message reply = pollReply(replyConsumer, sessionId);
                    if (reply == null) {
                        log.warn("StockCheckResponse not received in {}ms orderNumber={}",
                                timeoutMillis, orderNumber);
                        return unavailable(orderId, orderNumber,
                                "Inventory service did not answer within " + timeoutMillis + "ms");
                    }
                    return objectMapper.readValue(reply.getBody(byte[].class), StockCheckResponse.class);
                }
            }
        } catch (Exception exception) {
            log.warn("Stock check failed orderNumber={} reason={}", orderNumber, exception.getMessage());
            return unavailable(orderId, orderNumber, "Stock check failed: " + exception.getMessage());
        }
    }

    /** Espera el reply con el correlation id correcto, descartando mensajes ajenos. */
    private Message pollReply(MessageConsumer consumer, String expectedId) throws JMSException {
        long deadline = System.currentTimeMillis() + timeoutMillis;
        while (System.currentTimeMillis() < deadline) {
            long remaining = deadline - System.currentTimeMillis();
            Message reply = consumer.receive(Math.min(1000, remaining));
            if (reply == null) {
                continue;
            }
            String id = reply.getStringProperty(CORRELATION_PROPERTY);
            if (expectedId.equals(id)) {
                return reply;
            }
            log.warn("Discarding stock check reply with unexpected id={}", id);
        }
        return null;
    }

    private StockCheckResponse unavailable(Long orderId, String orderNumber, String detail) {
        return new StockCheckResponse(orderId, orderNumber, false, detail, java.util.List.of());
    }
}