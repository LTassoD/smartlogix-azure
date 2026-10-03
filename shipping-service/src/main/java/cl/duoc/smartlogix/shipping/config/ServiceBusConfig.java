package cl.duoc.smartlogix.shipping.config;

// --- Importaciones ---
import jakarta.jms.ConnectionFactory;                 // Fabrica de conexiones JMS (AMQP 1.0)
import org.apache.qpid.jms.JmsConnectionFactory;    // Cliente AMQP 1.0 de Qpid
import org.apache.qpid.jms.JmsTopic;                // Destination AMQP de tipo Topic
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jms.config.DefaultJmsListenerContainerFactory;
import org.springframework.jms.config.JmsListenerContainerFactory;
import org.springframework.util.ErrorHandler;

/**
 * Configuracion de Azure Service Bus para shipping.
 *
 * Equivalencia con la topologia RabbitMQ anterior:
 *
 *   RabbitMQ                                ->  Service Bus
 *   -------------------------------------       ------------------------------------------
 *   DirectExchange (durable)                ->  Topic smartlogix.orders.topic
 *   cola order.created + routing key        ->  Subscription shipping-created-sub
 *   cola order.cancelled + routing key      ->  Subscription shipping-cancelled-sub
 *   DLX fanout + DLQ propia                 ->  DLQ nativa por subscription ($deadletterqueue)
 *   x-message-ttl                           ->  default-message-time-to-live
 *   reintentos con requeue=false            ->  max-delivery-count con reentrega PeekLock
 *
 * IMPORTANTE — por que shipping tiene DOS subscriptions y no una:
 * En RabbitMQ cada flujo tenia su propia cola, asi que un order.created jamas podia
 * landing en el consumidor de cancelaciones. En Service Bus una subscription entrega
 * sus mensajes a consumidores COMPETIDORES (round-robin): si ambos listeners
 * escucharan la misma subscription, un order.created podria ser entregado al
 * OrderCancelledConsumer y morir en la DLQ por error de deserializacion.
 * Dos subscriptions, cada una con su SqlFilter, replican exactamente el
 * aislamiento del diseño original.
 */
@Configuration
public class ServiceBusConfig {

    /** Nombre logico del topico de eventos de pedido. */
    public static final String ORDERS_TOPIC = "smartlogix.orders.topic";

    /** Subscription que recibe order.created (crea el despacho). */
    public static final String SHIPPING_CREATED_SUBSCRIPTION = "shipping-created-sub";

    /** Subscription que recibe order.cancelled (cancela el despacho). */
    public static final String SHIPPING_CANCELLED_SUBSCRIPTION = "shipping-cancelled-sub";

    /** Sufijo de la DLQ que Service Bus crea automaticamente por subscription. */
    public static final String DEAD_LETTER_SUFFIX = "/$deadletterqueue";

    private final String host;
    private final String policyName;
    private final String policyKey;

    public ServiceBusConfig(
            @Value("${smartlogix.servicebus.host}") String host,
            @Value("${smartlogix.servicebus.policy-name}") String policyName,
            @Value("${smartlogix.servicebus.policy-key}") String policyKey) {
        this.host = host;
        this.policyName = policyName;
        this.policyKey = policyKey;
    }

    // --- ConnectionFactory: AMQP 1.0 contra el namespace de Service Bus ---
    @Bean
    public ConnectionFactory connectionFactory() {
        JmsConnectionFactory factory = new JmsConnectionFactory();
        factory.setRemoteURI("amqps://" + host);
        factory.setUsername(policyName);
        factory.setPassword(policyKey);
        factory.setCloseTimeout(3000);
        return factory;
    }

    // --- Contenedor de listeners ---
    @Bean
    public JmsListenerContainerFactory jmsListenerContainerFactory(ConnectionFactory connectionFactory) {
        DefaultJmsListenerContainerFactory factory = new DefaultJmsListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setSessionTransacted(false);
        // Si el listener lanza excepcion no se ACKea el mensaje: el broker lo reentrega
        // y, al agotar max-delivery-count, lo mueve a la DLQ de la subscription.
        factory.setErrorHandler(new ErrorHandler() {
            @Override
            public void handleError(Throwable t) {
                // El log con contexto de negocio lo hace el propio consumidor.
            }
        });
        // Spring solo entiende topic:// y queue://; Service Bus usa URIs amqps://.
        factory.setDestinationResolver(
                (context, destinationName, session) -> new JmsTopic(destinationName));
        return factory;
    }

    // --- Helpers de direccion ---
    public String createdSubscriptionDestination() {
        return subscription(SHIPPING_CREATED_SUBSCRIPTION);
    }

    public String cancelledSubscriptionDestination() {
        return subscription(SHIPPING_CANCELLED_SUBSCRIPTION);
    }

    public String createdDeadLetterDestination() {
        return subscription(SHIPPING_CREATED_SUBSCRIPTION) + DEAD_LETTER_SUFFIX;
    }

    public String cancelledDeadLetterDestination() {
        return subscription(SHIPPING_CANCELLED_SUBSCRIPTION) + DEAD_LETTER_SUFFIX;
    }

    private String subscription(String name) {
        return "amqps://" + host + "/" + ORDERS_TOPIC + "/Subscriptions/" + name;
    }
}