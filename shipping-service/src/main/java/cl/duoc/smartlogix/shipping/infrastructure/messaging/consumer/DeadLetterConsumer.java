package cl.duoc.smartlogix.shipping.infrastructure.messaging.consumer;

// --- Importaciones ---
import jakarta.jms.JMSException;                                       // Excepcion JMS
import jakarta.jms.Message;                                           // Mensaje AMQP crudo
import lombok.extern.slf4j.Slf4j;                                     // logger
import org.springframework.jms.annotation.JmsListener;               // Suscribe a las DLQ
import org.springframework.stereotype.Component;                       // bean de Spring

/**
 * Consumidor de las DEAD LETTER QUEUES de shipping.
 *
 * En RabbitMQ esto exigia un DLX fanout + una DLQ propia + dos bindings.
 * En Service Bus cada subscription genera su DLQ nativa con el sufijo
 * /$deadletterqueue cuando el mensaje agota max-delivery-count o expira.
 *
 * shipping tiene DOS subscriptions (created y cancelled), por lo que hay DOS DLQ
 * y por tanto dos listeners; ambos delegan en el mismo metodo para no duplicar
 * el diagnostico. El campo "stream" distingue de que flujo proviene el fallo.
 *
 * Service Bus no expone la cabecera x-death de RabbitMQ: el broker adjunta al
 * mensaje dead-lettereado DeadLetterSource, DeadLetterReason y
 * DeadLetterErrorDescription, que son las que se leen aqui.
 *
 * Este consumidor cumple ademas la alerta (rubrica 3.h): el log estructurado que
 * emite es la senal que las alert rules de Log Analytics vigilan.
 */
@Slf4j
@Component
public class DeadLetterConsumer {

    /** Fallos del flujo de creacion de despachos (order.created). */
    @JmsListener(destination = "${smartlogix.servicebus.shipping.created-dead-letter-destination}")
    public void consumeCreatedDeadLetter(Message message) throws JMSException {
        audit("shipping-created-sub", message);
    }

    /** Fallos del flujo de cancelacion de despachos (order.cancelled). */
    @JmsListener(destination = "${smartlogix.servicebus.shipping.cancelled-dead-letter-destination}")
    public void consumeCancelledDeadLetter(Message message) throws JMSException {
        audit("shipping-cancelled-sub", message);
    }

    private void audit(String stream, Message message) throws JMSException {
        String source = orUnknown(property(message, "DeadLetterSource"));
        String error = property(message, "DeadLetterErrorDescription");

        log.warn(
                "[DLQ] Dead letter received subscription={} source={} reason={} body={}",
                stream,
                source,
                error != null ? error : orUnknown(property(message, "DeadLetterReason")),
                body(message)
        );
    }

    private String orUnknown(String value) {
        return value != null ? value : "unknown";
    }

    private String property(Message message, String name) {
        try {
            return message.getStringProperty(name);
        } catch (JMSException e) {
            return null;
        }
    }

    private String body(Message message) {
        try {
            byte[] body = message.getBody(byte[].class);
            return body == null ? "" : new String(body);
        } catch (JMSException e) {
            return "<unreadable>";
        }
    }
}