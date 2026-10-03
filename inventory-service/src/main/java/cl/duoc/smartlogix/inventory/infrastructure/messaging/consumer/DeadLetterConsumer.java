package cl.duoc.smartlogix.inventory.infrastructure.messaging.consumer;

// --- Importaciones ---
import jakarta.jms.Message;                                                           // Mensaje AMQP crudo
import jakarta.jms.JMSException;
import lombok.extern.slf4j.Slf4j;                                                     // logger
import org.springframework.jms.annotation.JmsListener;                               // Suscribe a la DLQ
import org.springframework.stereotype.Component;                                       // bean de Spring

/**
 * Consumidor de la DEAD LETTER QUEUE de inventory.
 *
 * En RabbitMQ esto exigia declarar un DLX fanout + una DLQ propia + dos bindings.
 * En Service Bus la DLQ es nativa: el broker la crea automaticamente para cada
 * subscription con el sufijo /$deadletterqueue cuando el mensaje se agota
 * (max-delivery-count) o expira (default-message-time-to-live).
 *
 * Service Bus no expone la cabecera x-death de RabbitMQ. En su lugar el broker
 * adjunta al mensaje dead-lettereado las propiedades DeadLetterSource,
 * DeadLetterReason y DeadLetterErrorDescription, que son las que se leen aqui
 * para el diagnostico del fallo.
 *
 * Este consumidor cumple ademas la alerta (rúbrica 3.h): el log estructurado que
 * emite es la señal que las alert rules de Log Analytics vigilan.
 */
@Slf4j
@Component
public class DeadLetterConsumer {

    // @JmsListener sobre la DLQ nativa de la subscription de inventory.
    @JmsListener(destination = "${smartlogix.servicebus.inventory.dead-letter-destination}")
    public void consumeDeadLetter(Message message) throws JMSException {
        String source = orUnknown(property(message, "DeadLetterSource"));
        String error = property(message, "DeadLetterErrorDescription");

        log.warn(
                "[DLQ] Dead letter received subscription=inventory-sub source={} reason={} body={}",
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