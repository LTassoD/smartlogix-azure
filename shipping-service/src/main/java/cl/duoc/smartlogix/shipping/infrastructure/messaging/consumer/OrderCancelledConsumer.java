package cl.duoc.smartlogix.shipping.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.shipping.application.service.ShipmentService;   // Servicio que cancela el despacho
import cl.duoc.smartlogix.shipping.config.RabbitMQConfig;                // Nombre de la cola propia
import cl.duoc.smartlogix.shipping.infrastructure.messaging.event.OrderCancelledEvent; // El evento recibido
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener; // Suscribe a la cola
import org.springframework.stereotype.Component;

// Consumidor del evento "order.cancelled".
// Este consumer escucha la cola de cancelaciones — la routing key "order.cancelled"
// lo separa del flujo de confirmación: al recibir el evento, cancela el despacho
// asociado al pedido (si existe).
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCancelledConsumer {

    private final ShipmentService shipmentService;

    // @RabbitListener en la cola de pedidos cancelados
    // ("smartlogix.shipping.order-cancelled.queue").
    @RabbitListener(queues = RabbitMQConfig.SHIPPING_ORDER_CANCELLED_QUEUE)
    public void consume(OrderCancelledEvent event) {
        try {
            log.info(
                    "OrderCancelledEvent received orderId={} orderNumber={}",
                    event.getOrderId(),
                    event.getOrderNumber()
            );

            // Cancela el despacho asociado al pedido (si existe).
            shipmentService.cancelByOrderId(event.getOrderId());
        } catch (Exception exception) {
            // Mismo patrón que el consumer de order.created: propagamos la excepción
            // para que el contenedor reintente (backoff) y, al agotar, el mensaje
            // se rechace sin requeue → DLX → DLQ (auditoría, guía 2.2.2).
            log.warn(
                    "OrderCancelledEvent could not be processed orderId={} orderNumber={}",
                    event.getOrderId(),
                    event.getOrderNumber()
            );
            throw new RuntimeException(exception);
        }
    }
}