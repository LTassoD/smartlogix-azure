package cl.duoc.smartlogix.orders.config;

// --- Importaciones ---
import jakarta.jms.ConnectionFactory;                 // Fabrica de conexiones JMS (AMQP 1.0)
import jakarta.jms.Destination;                      // Destination JMS generico
import jakarta.jms.JMSException;                     // Excepcion JMS
import jakarta.jms.Session;                        // Session JMS (para resolver destinos)
import org.apache.qpid.jms.JmsConnectionFactory;    // Cliente AMQP 1.0 de Qpid
import org.apache.qpid.jms.JmsQueue;                // Destination AMQP de tipo Queue
import org.apache.qpid.jms.JmsTopic;                // Destination AMQP de tipo Topic
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jms.config.DefaultJmsListenerContainerFactory;
import org.springframework.jms.config.JmsListenerContainerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.util.ErrorHandler;

/**
 * Configuracion de Azure Service Bus para order-service.
 *
 * order-service es el PUBLISHER de los eventos de pedido y el CLIENTE del
 * request/reply de verificacion de stock. No consume eventos del topic.
 *
 *   RabbitMQ                                ->  Service Bus
 *   -------------------------------------       ------------------------------------------
 *   DirectExchange (durable)                ->  Topic smartlogix.orders.topic
 *   routing key "order.created"             ->  propiedad JMS eventType (SqlFilter)
 *   RabbitTemplate.convertAndSend           ->  JmsTemplate.send
 *   CorrelationData (publisher confirms)    ->  sin equivalente AMQP 1.0 nativo (ver nota)
 *   cola request + cola reply               ->  smartlogix.stock-check.req / .reply
 */
@Configuration
public class ServiceBusConfig {

    /** Topico de eventos de pedido (sustituye al DirectExchange durable). */
    public static final String ORDERS_TOPIC = "smartlogix.orders.topic";

    /**
     * NOMBRE DE LA PROPIEDAD que el SqlFilter de cada subscription evalua.
     * En RabbitMQ el tipo de evento viajaba en la routing key del exchange; en
     * Service Bus las subscriptions filtran por PROPIEDADES del mensaje, asi que
     * el publicador debe setear explicitamente eventType en cada envio. Sin esto
     * ninguna regla coincide y las subscriptions reciben cero mensajes.
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
        factory.setRemoteURI("amqps://" + host);
        factory.setUsername(policyName);
        factory.setPassword(policyKey);
        factory.setCloseTimeout(3000);
        return factory;
    }

    // --- Contenedor de listeners (usado por el cliente de stock check) ---
    @Bean
    public JmsListenerContainerFactory jmsListenerContainerFactory(ConnectionFactory connectionFactory) {
        DefaultJmsListenerContainerFactory factory = new DefaultJmsListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setSessionTransacted(false);
        factory.setErrorHandler(new ErrorHandler() {
            @Override
            public void handleError(Throwable t) {
                // El log con contexto lo hace el propio consumidor.
            }
        });
        // Spring 7 invierte los parametros: resolveDestinationName(Session, String, boolean)
        factory.setDestinationResolver(
                (session, destinationName, pubSub) -> resolve(destinationName, session));
        return factory;
    }

    /**
     * JmsTemplate para PUBLICAR. Comparte el resolver con el container factory, de
     * modo que el publicador puede pasar directamente la URI amqps:// y Spring
     * construye el JmsTopic o JmsQueue correcto.
     */
    @Bean
    public JmsTemplate jmsTemplate(ConnectionFactory connectionFactory) {
        JmsTemplate template = new JmsTemplate(connectionFactory);
        template.setDestinationResolver(
                (session, destinationName, pubSub) -> resolve(destinationName, session));
        return template;
    }

    /**
     * Resuelve el tipo de Destination correcto.
     *
     * Spring solo entiende topic:// y queue://, pero Service Bus usa URIs amqps://,
     * asi que hay que construir el Destination a mano. Un mismo servicio escucha
     * topics (subscriptions) y colas (request/reply), y AMQP 1.0 distingue
     * JmsTopic de JmsQueue: usar el tipo equivocado hace fallar la direccion.
     * OJO con la firma: en Spring 7 es resolveDestinationName(Session, String, boolean),
     * con la Session PRIMERO, no al estilo de jakarta.jms.DestinationResolver.
     */
    private Destination resolve(String destinationName, Session session) throws JMSException {
        if (isQueue(destinationName)) {
            return session.createQueue(destinationName);
        }
        return session.createTopic(destinationName);
    }

    /**
     * Las subscriptions de un topic SIEMPRE aparecen en la URI como
     * /Subscriptions/<nombre>; cualquier otra entidad es una cola. Detectar por
     * el sufijo del nombre (".req", ".reply") no es fiable: en
     * ".../smartlogix.stock-check.req" la secuencia "/.req" nunca aparece.
     */
    private boolean isQueue(String destinationName) {
        return !destinationName.contains("/Subscriptions/");
    }

    // --- Helpers de direccion ---
    public String ordersTopicDestination() {
        return "amqps://" + host + "/" + ORDERS_TOPIC;
    }

    public String stockCheckRequestQueue() {
        return "amqps://" + host + "/smartlogix.stock-check.req";
    }

    public String stockCheckReplyQueue() {
        return "amqps://" + host + "/smartlogix.stock-check.reply";
    }
}