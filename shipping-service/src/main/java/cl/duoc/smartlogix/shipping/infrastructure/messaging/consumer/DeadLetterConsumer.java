package cl.duoc.smartlogix.shipping.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.shipping.config.RabbitMQConfig;  // Nombre de la DLQ
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;              // Mensaje crudo (body + headers)
import org.springframework.amqp.core.MessageProperties;    // Propiedades/headers del mensaje
import org.springframework.amqp.rabbit.annotation.RabbitListener; // Suscribe a la DLQ
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

// Consumidor de la DEAD LETTER QUEUE de shipping.
// Recibe los mensajes que "murieron" en las colas de trabajo (order-created /
// order-cancelled) porque un consumidor los rechazó, expiraron por TTL o la cola
// se llenó. Su función es de AUDITORÍA: registra la alerta y los headers "x-death"
// que RabbitMQ agrega (cuántas veces murió y por qué) para diagnóstico (guía 2.2.2).
@Slf4j
@Component
@RequiredArgsConstructor
public class DeadLetterConsumer {

    // @RabbitListener en la DLQ propia de shipping ("smartlogix.shipping.dlq").
    @RabbitListener(queues = RabbitMQConfig.SHIPPING_DLQ)
    public void consumeDeadLetter(Message message) {
        MessageProperties properties = message.getMessageProperties();

        // x-death: lista que RabbitMQ añade a cada mensaje muerto. Cada entrada tiene
        // "count" (cuántas veces se intentó), "reason" (expired/rejected/maxlen) y la cola.
        List<Map<String, ?>> xDeath = properties.getXDeathHeader();

        String reason = "unknown";
        Integer count = 0;
        if (xDeath != null && !xDeath.isEmpty()) {
            Map<String, ?> death = xDeath.get(0);
            reason = death.get("reason") != null ? death.get("reason").toString() : "unknown";
            count = death.get("count") instanceof Number n ? n.intValue() : 0;
        }

        // Alerta de auditoría: visible en sl-shipping.log como [DLQ] ...
        log.warn(
                "[DLQ] Dead letter received queue={} reason={} attempts={} body={}",
                properties.getConsumerQueue(),
                reason,
                count,
                new String(message.getBody())
        );
    }
}