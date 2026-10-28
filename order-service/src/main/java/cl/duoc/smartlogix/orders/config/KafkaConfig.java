package cl.duoc.smartlogix.orders.config;

/**
 * Constantes del publicador de Kafka (EP3).
 *
 * El evento de pedido viaja a DOS destinos con el MISMO payload:
 *
 *   Service Bus  -> coreografia transaccional (inventory-sub, shipping-*)
 *   Kafka        -> analitica en tiempo real (dashboard de metricas)
 *
 * Esto es "dual publish": no se reemplaza el broker de la EP2, se agrega un
 * segundo destino especializado en streaming. Si Kafka no esta disponible el
 * pedido sigue su curso (ver OrderEventPublisher#publicarEnKafka).
 */
public final class KafkaConfig {

    /** Header con el tipo de evento: mismo valor que la propiedad JMS eventType. */
    public static final String EVENT_TYPE_HEADER = "eventType";

    /** Header de correlacion: numero de pedido (tambien es la key del mensaje). */
    public static final String ORDER_NUMBER_HEADER = "orderNumber";

    /** Header de trazabilidad: quien produjo el evento. */
    public static final String SOURCE_HEADER = "source";

    public static final String SOURCE_VALUE = "smartlogix-order-service";

    private KafkaConfig() {
        // Clase de constantes.
    }
}
