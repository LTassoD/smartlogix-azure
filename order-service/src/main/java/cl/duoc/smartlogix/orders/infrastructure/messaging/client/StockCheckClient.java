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
 * Se implementa a mano en vez de usar convertAndReceive porque la correlacion se
 * hace por property (stockCheckId) y porque hace falta crear el consumidor del
 * reply ANTES de enviar la peticion: si se enviara primero, el reply podria llegar
 * antes de que exista el consumidor.
 *
 * Sin respuesta el metodo devuelve available=false tras agotar el timeout, de modo
 * que una caida del broker de inventario ni deja el pedido colgado ni revienta la
 * transaccion.
 */
@Slf4j
@Component
public class StockCheckClient {

    /**
     * Property propia para correlacionar la respuesta con su peticion.
     *
     * IMPORTANTE: se opto por correlacion por property y NO por Sessions de Service
     * Bus. Se probo empiricamente que Qpid JMS NO admite receptores "sessionful":
     * al intentar consumir de una cola con Sessions el broker responde
     *   "It is not possible for an entity that requires sessions to create a
     *    non-sessionful message receiver"
     * y Qpid no expone ninguna opcion publica para crear uno. Las colas .req y .reply
     * se crearon por eso con enableSession=false.
     *
     * Consecuencia a tener en cuenta: .reply es una cola compartida, asi que con
     * VARIAS réplicas de order-service los replies se reparten round-robin y una
     * réplica podria recibir el reply de otra. Con una sola instancia es correcto,
     * que es el despliegue actual. Si se escalara horizontalmente, la solucion es
     * dar a cada replica su propia cola de reply.
     */
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
     * La correlacion va por la property stockCheckId: un id unico por llamada, que
     * el servidor copia al reply y el cliente usa para descartar ajenos.
     */
    public StockCheckResponse checkStock(
            Long orderId,
            String orderNumber,
            java.util.List<StockCheckRequest.Item> items) {

        String correlationId = "stock-check-" + orderNumber + "-" + System.nanoTime();
        try {
            byte[] body = objectMapper.writeValueAsBytes(new StockCheckRequest(orderId, orderNumber, items));

            try (Connection connection = connectionFactory.createConnection()) {
                Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
                connection.start();

                Queue requestQueue = session.createQueue(serviceBusConfig.stockCheckRequestQueue());
                Queue replyQueue = session.createQueue(serviceBusConfig.stockCheckReplyQueue());

                try (MessageConsumer replyConsumer = session.createConsumer(replyQueue);
                     MessageProducer producer = session.createProducer(requestQueue)) {

                    // JMS 3.1 elimino Message.setObject: el cuerpo se escribe con
                    // BytesMessage y el receptor lo lee con getBody(byte[].class).
                    BytesMessage request = session.createBytesMessage();
                    request.writeBytes(body);
                    request.setStringProperty(CORRELATION_PROPERTY, correlationId);
                    request.setStringProperty("orderNumber", orderNumber);

                    // El consumidor del reply se crea ANTES del envio: si se enviara
                    // primero, el reply podria llegar antes de que exista el consumidor.
                    producer.send(request);

                    Message reply = pollReply(replyConsumer, correlationId);
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