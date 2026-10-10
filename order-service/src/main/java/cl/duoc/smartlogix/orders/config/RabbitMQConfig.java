package cl.duoc.smartlogix.orders.config;

// --- Importaciones de Spring AMQP: tipos para definir la topología de RabbitMQ ---
import org.springframework.amqp.core.Binding;              // Enlace cola <-> exchange
import org.springframework.amqp.core.BindingBuilder;       // Constructor fluido de bindings
import org.springframework.amqp.core.DirectExchange;       // Exchange directo (routing exacto)
import org.springframework.amqp.core.TopicExchange;        // Exchange por patrón (routing comodín)
import org.springframework.amqp.core.Queue;                // Cola de mensajes
import org.springframework.amqp.rabbit.connection.ConnectionFactory;  // Fábrica de conexiones AMQP
import org.springframework.amqp.rabbit.connection.CorrelationData;    // ID que vincula publicación ↔ confirmación
import org.springframework.amqp.rabbit.core.RabbitTemplate;           // Cliente de publicación (usa confirms)
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter; // Convierte Java/JSON al publicar
import org.springframework.amqp.support.converter.MessageConverter;            // Interface del conversor
import org.springframework.context.annotation.Bean;        // Declara beans de Spring
import org.springframework.context.annotation.Configuration; // Esta clase es de configuración
import lombok.extern.slf4j.Slf4j;                          // Logger para el callback de confirms

// @Slf4j: crea el logger `log` (se usa en el callback de confirms).
// @Configuration: Spring detecta esta clase al arrancar y ejecuta sus @Bean
// para registrar los componentes de RabbitMQ (exchange, cola, binding, conversor).
@Slf4j
@Configuration
public class RabbitMQConfig {

    // NOMBRES COMPARTIDOS (el CONTRATO del publisher y los consumers):
    // El exchange y las routing keys deben ser idénticos en los 3 servicios
    // para que el mensaje llegue. La cola, en cambio, es PROPIA de cada servicio.
    public static final String ORDERS_EXCHANGE = "smartlogix.orders.exchange";   // Router común (direct)
    public static final String ORDERS_TOPIC_EXCHANGE = "smartlogix.orders.topic.exchange"; // Router por patrón (topic)
    public static final String ORDER_CREATED_ROUTING_KEY = "order.created";      // Regla de ruteo: pedido CONFIRMED
    public static final String ORDER_CANCELLED_ROUTING_KEY = "order.cancelled";  // Regla de ruteo: pedido CANCELLED
    public static final String ORDER_CREATED_QUEUE = "smartlogix.orders.created.queue";   // Cola propia (order.created)
    public static final String ORDER_CANCELLED_QUEUE = "smartlogix.orders.cancelled.queue"; // Cola propia (order.cancelled)

    // DirectExchange: el mensaje va a las colas cuyo binding use EXACTAMENTE
    // la routing key del mensaje. (true = durable, false = no auto-delete)
    @Bean
    public DirectExchange ordersExchange() {
        return new DirectExchange(ORDERS_EXCHANGE, true, false);
    }

    // Colas durables (true): sobreviven reinicios del broker.
    // Nota: order-service declara sus colas pero NO tiene @RabbitListener sobre ellas
    // (son el "registro" de cada tipo de evento; los consumers reales están en los otros servicios).
    @Bean
    public Queue orderCreatedQueue() {
        return new Queue(ORDER_CREATED_QUEUE, true);
    }

    @Bean
    public Queue orderCancelledQueue() {
        return new Queue(ORDER_CANCELLED_QUEUE, true);
    }

    // Bindings: enlazan cada cola propia contra el exchange con su routing key.
    // Los inyecta Spring (mismos nombres de parámetro que los beans definidos arriba).
    @Bean
    public Binding orderCreatedBinding(Queue orderCreatedQueue, DirectExchange ordersExchange) {
        return BindingBuilder.bind(orderCreatedQueue)
                .to(ordersExchange)
                .with(ORDER_CREATED_ROUTING_KEY);
    }

    @Bean
    public Binding orderCancelledBinding(Queue orderCancelledQueue, DirectExchange ordersExchange) {
        return BindingBuilder.bind(orderCancelledQueue)
                .to(ordersExchange)
                .with(ORDER_CANCELLED_ROUTING_KEY);
    }

    // ========== TOPIC EXCHANGE (segundo tipo exigido por la pauta) ==========
    // Además del DirectExchange, se declara un TopicExchange que enruta por
    // PATRONES con comodines: '*' = una palabra, '#' = cero o más palabras.
    // Las colas de eventos se enlazan con "order.#", de modo que cualquier evento
    // "order.*" se entrega a ambas. Demostración del ruteo por patrón (guía 2.1.2).
    @Bean
    public TopicExchange ordersTopicExchange() {
        return new TopicExchange(ORDERS_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public Binding orderCreatedTopicBinding(Queue orderCreatedQueue, TopicExchange ordersTopicExchange) {
        return BindingBuilder.bind(orderCreatedQueue)
                .to(ordersTopicExchange)
                .with("order.#");
    }

    @Bean
    public Binding orderCancelledTopicBinding(Queue orderCancelledQueue, TopicExchange ordersTopicExchange) {
        return BindingBuilder.bind(orderCancelledQueue)
                .to(ordersTopicExchange)
                .with("order.cancelled");
    }

    // Conversor JSON: al publicar/recibir, serializa el POJO OrderCreatedEvent a JSON
    // y viceversa. Imprescindible para que los 3 servicios se "entiendan" sin acoplarse.
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    // RabbitTemplate PROPIO con PUBLISHER CONFIRMS (guía 2.2.1).
    // Reemplaza al template autoconfigurado de Spring Boot: mismo ConnectionFactory y
    // conversor, pero le registramos setConfirmCallback → cada publicación recibe
    // un ack/nack del broker junto al CorrelationData (que identifica el mensaje).
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());

        // confirmCallback: el broker responde por CADA mensaje publicado:
        //  - ack  = el broker recibió el mensaje (escrito a disco si es persistente).
        //  - nack = el broker NO lo pudo manejar (cause trae el motivo, ej. error interno).
        // El CorrelationData es el que el productor adjuntó (aquí: el orderNumber).
        template.setConfirmCallback((correlationData, ack, cause) -> {
            String id = correlationData != null ? correlationData.getId() : "n/a";
            if (ack) {
                log.info("PublisherConfirm ACK correlationId={}", id);
            } else {
                log.warn("PublisherConfirm NACK correlationId={} cause={}", id, cause);
            }
        });

        return template;
    }
}