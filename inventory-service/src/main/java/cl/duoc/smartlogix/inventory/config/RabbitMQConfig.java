package cl.duoc.smartlogix.inventory.config;

// --- Importaciones de Spring AMQP (mismo set que el config del order-service) ---
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // CONTRATO COMPARTIDO: exchange y routing key IGUALES al order-service.
    public static final String ORDERS_EXCHANGE = "smartlogix.orders.exchange";
    // Segundo tipo de exchange exigido por la pauta: TopicExchange (ruteo por patrón).
    public static final String ORDERS_TOPIC_EXCHANGE = "smartlogix.orders.topic.exchange";
    public static final String ORDER_CREATED_ROUTING_KEY = "order.created";
    public static final String INVENTORY_ORDER_CREATED_QUEUE = "smartlogix.inventory.order-created.queue"; // Cola de trabajo propia

    // DLX/DLQ del ecosistema (guías 2.2.2 y 2.2.3). DLQ POR SERVICIO.
    public static final String ORDERS_DLX = "smartlogix.inventory.dlx";     // Dead Letter Exchange (fanout)
    public static final String INVENTORY_DLQ = "smartlogix.inventory.dlq";  // Dead Letter Queue de inventory
    public static final String DLX_ROUTING_KEY = "order.dead";              // Routing key del mensaje muerto

    // Exchange directo durable (idempotente: no se duplica si ya existe).
    @Bean
    public DirectExchange ordersExchange() {
        return new DirectExchange(ORDERS_EXCHANGE, true, false);
    }

    // Cola de trabajo con DLX + política de retención (TTL 30s): un mensaje que
    // falle al procesarse (rechazado por el consumidor) o que nadie consuma en 30s
    // se deriva al DLX → DLQ en lugar de perderse.
    @Bean
    public Queue inventoryOrderCreatedQueue() {
        return QueueBuilder.durable(INVENTORY_ORDER_CREATED_QUEUE)
                .withArgument("x-dead-letter-exchange", ORDERS_DLX)
                .withArgument("x-dead-letter-routing-key", DLX_ROUTING_KEY)
                .withArgument("x-message-ttl", 30000)
                .build();
    }

    // Enlaza la cola de inventory al exchange con la routing key "order.created".
    @Bean
    public Binding inventoryOrderCreatedBinding(Queue inventoryOrderCreatedQueue, DirectExchange ordersExchange) {
        return BindingBuilder.bind(inventoryOrderCreatedQueue)
                .to(ordersExchange)
                .with(ORDER_CREATED_ROUTING_KEY);
    }

    // TopicExchange + binding por PATRÓN "order.#": la misma cola recibe todos
    // los eventos de pedido mediante el enrutamiento por comodín (pauta: direct + topic).
    @Bean
    public TopicExchange ordersTopicExchange() {
        return new TopicExchange(ORDERS_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public Binding inventoryOrderCreatedTopicBinding(Queue inventoryOrderCreatedQueue, TopicExchange ordersTopicExchange) {
        return BindingBuilder.bind(inventoryOrderCreatedQueue)
                .to(ordersTopicExchange)
                .with("order.#");
    }

    // ========== DEAD LETTER EXCHANGE (DLX) y DEAD LETTER QUEUE (DLQ) ==========
    // DLX fanout durable: entrega copias del mensaje muerto a todas sus colas.
    @Bean
    public FanoutExchange ordersDeadLetterExchange() {
        return new FanoutExchange(ORDERS_DLX, true, false);
    }

    // DLQ durable con TTL 24h (86 400 000 ms): retención del histórico de fallidos.
    @Bean
    public Queue inventoryDeadLetterQueue() {
        return QueueBuilder.durable(INVENTORY_DLQ)
                .withArgument("x-message-ttl", 86400000)
                .build();
    }

    // Enlaza la DLQ de inventory al DLX fanout.
    @Bean
    public Binding inventoryDeadLetterBinding(Queue inventoryDeadLetterQueue, FanoutExchange ordersDeadLetterExchange) {
        return BindingBuilder.bind(inventoryDeadLetterQueue)
                .to(ordersDeadLetterExchange);
    }

    // Mismo conversor JSON para recibir el evento deserializado como OrderCreatedEvent.
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}