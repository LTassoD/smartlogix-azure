package cl.duoc.smartlogix.shipping.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.shipping.application.service.ShipmentService;   // Servicio que crea el despacho
import cl.duoc.smartlogix.shipping.config.RabbitMQConfig;                // Nombre de la cola propia
import cl.duoc.smartlogix.shipping.infrastructure.messaging.event.OrderCreatedEvent; // El evento recibido
import cl.duoc.smartlogix.shipping.presentation.dto.response.ShipmentResponse;       // Respuesta con el número de despacho
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener; // Suscribe a la cola
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCreatedConsumer {

    // Servicio de shipping: contiene createFromOrderEvent, que crea/retorna el despacho.
    private final ShipmentService shipmentService;

    // @RabbitListener en la cola propia de shipping ("smartlogix.shipping.order-created.queue").
    // Cada pedido confirmado LLEGA aquí para transformarse en un despacho (Shipment).
    @RabbitListener(queues = RabbitMQConfig.SHIPPING_ORDER_CREATED_QUEUE)
    public void consume(OrderCreatedEvent event) {
        try {
            // Crea el despacho en estado PENDING_ASSIGNMENT (sin transportista aún)
            // y retorna el objeto con su número "SHP-YYYYMMDD-XXXXX".
            ShipmentResponse shipment = shipmentService.createFromOrderEvent(event);

            // Log de éxito: visual en sl-shipping.log (el "processed ... shipmentNumber=..." que vimos).
            log.info(
                    "OrderCreatedEvent processed orderId={} orderNumber={} shipmentNumber={}",
                    event.getOrderId(),
                    event.getOrderNumber(),
                    shipment.getShipmentNumber()
            );
        } catch (Exception exception) {
            // Error → advertencia y PROPAGAMOS la excepción (sin tragarla).
            // Esto es clave para el patrón DLX/DLQ (guía 2.2.2): con el retry activado
            // el contenedor reintenta (backoff) y, al agotar intentos, rechaza el mensaje
            // sin requeue → RabbitMQ lo redirige al DLX → DLQ para auditoría.
            log.warn(
                    "OrderCreatedEvent could not be processed orderId={} orderNumber={}",
                    event.getOrderId(),
                    event.getOrderNumber()
            );
            throw new RuntimeException(exception);
        }
    }
}