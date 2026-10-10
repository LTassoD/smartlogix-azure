package cl.duoc.smartlogix.inventory.infrastructure.messaging.consumer;

// --- Importaciones ---
import cl.duoc.smartlogix.inventory.application.service.InventoryOrderEventService; // Servicio que aplica el descuento de stock
import cl.duoc.smartlogix.inventory.config.RabbitMQConfig;                          // Nombre de la cola propia
import cl.duoc.smartlogix.inventory.infrastructure.messaging.event.OrderCreatedEvent; // El evento recibido
import lombok.RequiredArgsConstructor; // constructor con los campos final
import lombok.extern.slf4j.Slf4j;     // logger
import org.springframework.amqp.rabbit.annotation.RabbitListener; // ANOTACIÓN CLAVE: suscribe este método a AMQP
import org.springframework.stereotype.Component; // bean de Spring

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCreatedConsumer {

    // El servicio de aplicación que procesa el evento (descarga stock, valida, evita duplicados).
    private final InventoryOrderEventService inventoryOrderEventService;

    // @RabbitListener: le dice a Spring AMQP que escuche la cola
    // "smartlogix.inventory.order-created.queue" en un hilo de un contenedor de listeners.
    // Cada mensaje que aterrice en esa cola invoca a consume(event) con el JSON ya
    // convertido a OrderCreatedEvent (gracias al JacksonJsonMessageConverter).
    @RabbitListener(queues = RabbitMQConfig.INVENTORY_ORDER_CREATED_QUEUE)
    public void consume(OrderCreatedEvent event) {
        try {
            // 1) Log de entrada: confirma que el mensaje llegó a inventory (visible en sl-inventory.log).
            log.info(
                    "OrderCreatedEvent received in inventory orderId={} orderNumber={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber()
            );

            // 2) Delega la lógica de negocio al servicio de aplicación:
            //    valida el evento, valida cada ítem, evita procesar 2 veces lo mismo
            //    y registra el movimiento de salida de stock (ORDER_OUT).
            inventoryOrderEventService.processOrderCreated(event);
        } catch (Exception exception) {
            // Si algo falla, PROPAGAMOS la excepción (patrón DLX/DLQ de las guías 2.2.2/2.2.3).
            // El contenedor reintenta con backoff (1s, 2s, 4s) y al agotar 3 intentos
            // rechaza el mensaje sin requeue → RabbitMQ lo redirige al DLX → DLQ.
            log.warn(
                    "OrderCreatedEvent could not be processed in inventory orderId={} orderNumber={} reason={}",
                    event == null ? null : event.getOrderId(),
                    event == null ? null : event.getOrderNumber(),
                    exception.getMessage()
            );
            throw new RuntimeException(exception);
        }
    }
}