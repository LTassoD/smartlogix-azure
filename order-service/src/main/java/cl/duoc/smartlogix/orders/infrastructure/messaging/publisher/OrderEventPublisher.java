package cl.duoc.smartlogix.orders.infrastructure.messaging.publisher;

// --- Importaciones ---
import cl.duoc.smartlogix.orders.config.RabbitMQConfig;                                   // Nombres del exchange y routing keys
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedEvent;        // DTO del evento de pedido creado
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCancelledEvent;      // DTO del evento de pedido cancelado
import lombok.RequiredArgsConstructor;   // Genera el constructor con los campos final
import lombok.extern.slf4j.Slf4j;        // Da un logger (log.warn, log.info)
import org.springframework.amqp.AmqpException;                 // Excepción base de AMQP (fallo de conexión/envío)
import org.springframework.amqp.rabbit.connection.CorrelationData; // ID del mensaje para los publisher confirms
import org.springframework.amqp.rabbit.core.RabbitTemplate;    // Cliente de Spring para publicar/consumir
import org.springframework.stereotype.Component;                // Registra esta clase como bean de Spring

// @Slf4j: crea el atributo `log` para escribir en consola.
// @Component: Spring detecta esta clase y la inyecta donde se necesite.
@Slf4j
@Component
// @RequiredArgsConstructor: genera automáticamente un constructor que recibe
// todos los campos `final` (aquí: rabbitTemplate). Soluciona la inyección de dependencias.
@RequiredArgsConstructor
public class OrderEventPublisher {

    // RabbitTemplate: el objeto que realmente conecta con RabbitMQ y envía el mensaje.
    private final RabbitTemplate rabbitTemplate;

    // Método público que publica el evento de pedido confirmado.
    public void publishOrderCreated(OrderCreatedEvent event) {
        try {
            // convertAndSend = construir el mensaje (JSON vía el converter) y publicarlo.
            // Parámetros: exchange de destino, routing key, el payload y un CorrelationData
            //   que identifica el mensaje → el broker responderá con ack/nack (publisher confirms).
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ORDERS_EXCHANGE,        // Mediator: "smartlogix.orders.exchange"
                    RabbitMQConfig.ORDER_CREATED_ROUTING_KEY, // Regla: "order.created"
                    event,                                 // Cuerpo: el OrderCreatedEvent serializado a JSON
                    new CorrelationData("created-" + event.getOrderNumber()) // ID para identificar el ACK
            );
            // El exchange lo entrega a TODAS las colas enlazadas con "order.created"
            // (la de inventory y la de shipping), desacoplando al productor de los consumidores.
        } catch (AmqpException exception) {
            // Cualquier problema (broker caído, exchange inexistente, etc.) NO reventará
            // la transacción del pedido: solo se registra una advertencia y el pedido sigue.
            log.warn("OrderCreatedEvent could not be published for orderNumber={}", event.getOrderNumber());
        }
    }

    // Publica el evento de CANCELACIÓN de pedido.
    // Usa la routing key "order.cancelled": el exchange solo lo entregará a las colas
    // que tengan un binding con ESA key (la cola de cancelaciones) — no a las de order.created.
    // Así implementamos el "filtrado selectivo por routing key" de la guía 2.1.3.
    public void publishOrderCancelled(OrderCancelledEvent event) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ORDERS_EXCHANGE,          // Mismo exchange compartido
                    RabbitMQConfig.ORDER_CANCELLED_ROUTING_KEY, // "order.cancelled" → ruteo distinto
                    event,                                   // Cuerpo: el OrderCancelledEvent (JSON)
                    new CorrelationData("cancelled-" + event.getOrderNumber()) // ID para identificar el ACK
            );
        } catch (AmqpException exception) {
            log.warn("OrderCancelledEvent could not be published for orderNumber={}", event.getOrderNumber());
        }
    }
}