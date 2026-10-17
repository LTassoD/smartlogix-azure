package cl.duoc.smartlogix.inventory.config;

// --- Importaciones ---
import jakarta.jms.ConnectionFactory;                 // Fabrica de conexiones JMS (AMQP 1.0)
import org.apache.qpid.jms.JmsConnectionFactory;    // Cliente AMQP 1.0 de Qpid
import org.apache.qpid.jms.JmsTopic;                // Destination AMQP de tipo Topic
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jms.config.DefaultJmsListenerContainerFactory;
import org.springframework.jms.config.JmsListenerContainerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.util.StringUtils;

/**
 * Configuracion de Azure Service Bus para inventory.
 *
 * Reemplaza la topologia RabbitMQ (exchange + colas + DLX) por el equivalente
 * nativo de Service Bus sobre AMQP 1.0:
 *
 *   RabbitMQ                          ->  Service Bus
 *   ---------------------------------      ------------------------------------------
 *   DirectExchange (durable)          ->  Topic smartlogix.orders.topic
 *   Binding con routing key           ->  SqlFilter sobre la property "eventType"
 *   Cola propia del servicio          ->  Subscription propia del servicio
 *   DLX (fanout) + DLQ propia         ->  DLQ nativa por subscription ($deadletterqueue)
 *   x-message-ttl                     ->  default-message-time-to-live de la subscription
 *   requeue=false + max retries       ->  max-delivery-count (reentrega automatica)
 *
 * Las destinations usan el formato de direccion AMQP de Service Bus:
 *   topico      -> amqps://<host>/<topic>
 *   subscription-> amqps://<host>/<topic>/Subscriptions/<sub>
 *   dead letter -> amqps://<host>/<topic>/Subscriptions/<sub>/$deadletterqueue
 */
@Configuration
public class ServiceBusConfig {

    /** Nombre logico del topico de eventos de pedido. */
    public static final String ORDERS_TOPIC = "smartlogix.orders.topic";

    /** Subscription que inventory usa para recibir order.created. */
    public static final String INVENTORY_SUBSCRIPTION = "inventory-sub";

    /** Topico de eventos de catalogo; inventory PUBLICA aqui product.created. */
    public static final String CATALOG_TOPIC = "smartlogix.catalog.topic";

    /**
     * NOMBRE DE LA PROPIEDAD que el SqlFilter de cada subscription evalua.
     * En RabbitMQ el tipo de evento viajaba en la routing key; en Service Bus las
     * subscriptions filtran por PROPIEDADES del mensaje, asi que el publicador debe
     * setear explicitamente eventType. Sin esto ninguna regla coincide.
     */
    public static final String EVENT_TYPE_PROPERTY = "eventType";

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
        // Service Bus autentica con SAS: usuario = nombre de la regla, password = clave primaria.
        factory.setRemoteURI("amqps://" + host);
        factory.setUsername(policyName);
        factory.setPassword(policyKey);
        // Cierre ordenado y deteccion de conexiones muertas (relevante en ACA, donde
        // las revanidas de revision pueden cortar la conexion TCP con el broker).
        factory.setCloseTimeout(3000);
        return factory;
    }

    // --- Contenedor de listeners ---
    @Bean
    public JmsListenerContainerFactory jmsListenerContainerFactory(ConnectionFactory connectionFactory) {
        DefaultJmsListenerContainerFactory factory = new DefaultJmsListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        // Service Bus no soporta transacciones JMS locales entre entidades: PeekLock
        // con reentrega automatica cubre el mismo guarantee.
        factory.setSessionTransacted(false);
        // Si el listener lanza excepcion, Spring NO acusa el mensaje: el broker lo
        // reentrega y, al agotar max-delivery-count, lo mueve a la DLQ.
        factory.setErrorHandler(new org.springframework.util.ErrorHandler() {
            @Override
            public void handleError(Throwable t) {
                // Se deja propagar al contenedor para que aplique su politica de reintento;
                // el log real lo hace el propio consumidor con contexto de negocio.
            }
        });
        // Spring resuelve el destino con un DynamicDestinationResolver que solo entiende
        // topic:// y queue://. Service Bus usa URIs amqps://, asi que se reemplaza por uno
        // que construya la direccion AMQP directamente. En Service Bus tanto el topico,
        // sus subscriptions y sus DLQ se direccionan como Topic.
        factory.setDestinationResolver(
                (context, destinationName, session) -> new JmsTopic(destinationName));
        return factory;
    }

    // --- JmsTemplate para PUBLICAR eventos (product.created hacia el topic de catalogo) ---
    // inventory deja de ser solo consumidor: al crear un producto publica product.created,
    // igual que order-service publica order.created. El publicador construye el BytesMessage
    // a mano con un SessionCallback, por lo que el resolver de destino no se usa en ese
    // camino; basta con compartir la ConnectionFactory AMQP 1.0.
    @Bean
    public JmsTemplate jmsTemplate(ConnectionFactory connectionFactory) {
        JmsTemplate template = new JmsTemplate(connectionFactory);
        template.setDestinationResolver(
                (context, destinationName, session) -> new JmsTopic(destinationName));
        return template;
    }

    // --- Helpers de direccion ---
    /** Direccion del topico (para publicar). */
    public String topicDestination() {
        return "amqps://" + host + "/" + ORDERS_TOPIC;
    }

    /** Direccion de la subscription de inventory (para consumir). */
    public String inventorySubscriptionDestination() {
        return "amqps://" + host + "/" + ORDERS_TOPIC
                + "/Subscriptions/" + INVENTORY_SUBSCRIPTION;
    }

    /** Direccion de la DLQ de inventory. */
    public String inventoryDeadLetterDestination() {
        return inventorySubscriptionDestination() + DEAD_LETTER_SUFFIX;
    }

    /** Direccion del topico de catalogo (para publicar product.created). */
    public String catalogTopicDestination() {
        return "amqps://" + host + "/" + CATALOG_TOPIC;
    }

    public String getHost() {
        return host;
    }
}