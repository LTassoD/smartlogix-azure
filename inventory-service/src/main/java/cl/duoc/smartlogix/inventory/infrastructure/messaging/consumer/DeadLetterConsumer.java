package cl.duoc.smartlogix.inventory.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.config.RabbitMQConfig;  // Nombre de la DLQ
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;              // Mensaje crudo (body + headers)
import org.springframework.amqp.core.MessageProperties;    // Propiedades/headers del mensaje
import org.springframework.amqp.rabbit.annotation.RabbitListener; // Suscribe a la DLQ
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

// Consumidor de la DEAD LETTER QUEUE de inventory.
// Audita los mensajes de pedido que fallaron en el descuento de stock y fueron
// redirigidos al DLX → DLQ (por rechazo del consumidor, TTL o cola llena).
// Registra el motivo (x-death) para diagnóstico (guía 2.2.2).
@Slf4j
@Component
@RequiredArgsConstructor
public class DeadLetterConsumer {

    // @RabbitListener en la DLQ propia de inventory ("smartlogix.inventory.dlq").
    @RabbitListener(queues = RabbitMQConfig.INVENTORY_DLQ)
    public void consumeDeadLetter(Message message) {
        MessageProperties properties = message.getMessageProperties();

        List<Map<String, ?>> xDeath = properties.getXDeathHeader();

        String reason = "unknown";
        Integer count = 0;
        if (xDeath != null && !xDeath.isEmpty()) {
            Map<String, ?> death = xDeath.get(0);
            reason = death.get("reason") != null ? death.get("reason").toString() : "unknown";
            count = death.get("count") instanceof Number n ? n.intValue() : 0;
        }

        log.warn(
                "[DLQ] Dead letter received queue={} reason={} attempts={} body={}",
                properties.getConsumerQueue(),
                reason,
                count,
                new String(message.getBody())
        );
    }
}