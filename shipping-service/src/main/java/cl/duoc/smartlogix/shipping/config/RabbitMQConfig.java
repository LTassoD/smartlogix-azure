package cl.duoc.smartlogix.shipping.config;

// --- Importaciones de Spring AMQP (mismo patrón que los otros 2 servicios) ---
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

    // CONTRATO COMPARTIDO: exchange y routing keys IGUALES a order e inventory.
    public static final String ORDERS_EXCHANGE = "smartlogix.orders.exchange";
    public static final String ORDERS_TOPIC_EXCHANGE = "smartlogix.orders.topic.exchange";
    public static final String ORDER_CREATED_ROUTING_KEY = "order.created";     // Pedido confirmado
    public static final String ORDER_CANCELLED_ROUTING_KEY = "order.cancelled"; // Pedido cancelado

    // Colas de TRABAJO propias de shipping-service (una por tipo de evento).
    public static final String SHIPPING_ORDER_CREATED_QUEUE = "smartlogix.shipping.order-created.queue";   // Cola de pedidos confirmados
    public static final String SHIPPING_ORDER_CANCELLED_QUEUE = "smartlogix.shipping.order-cancelled.queue"; // Cola de pedidos cancelados

    // DLX/DLQ del ecosistema (guías 2.2.2 y 2.2.3).
    // Un mensaje "muere" y va al DLX en 3 casos: nack con requeue=false,
    // expiración por TTL, o cola llena. Aquí la DLQ es POR SERVICIO.
    public static final String ORDERS_DLX = "smartlogix.shipping.dlx";       // Dead Letter Exchange (fanout)
    public static final String SHIPPING_DLQ = "smartlogix.shipping.dlq";     // Dead Letter Queue de shipping
    public static final String DLX_ROUTING_KEY = "order.dead";               // Routing key del mensaje muerto

    // Exchange directo durable (idempotente: no se duplica si ya existe).
    @Bean
    public DirectExchange ordersExchange() {
        return new DirectExchange(ORDERS_EXCHANGE, true, false);
    }

    // Colas de trabajo con DLX configurado + política de retención (TTL 30s):
    // 1. Con x-dead-letter-exchange: si un consumidor rechaza el mensaje (o expira),
    //    este se re-enruta automáticamente al DLX → DLQ en vez de perderse.
    // 2. Con x-message-ttl=30000: un mensaje que nadie procesa en 30s se "mata"
    //    y derivada al DLX (reintentos = política de retención de la cola).
    @Bean
    public Queue shippingOrderCreatedQueue() {
        return QueueBuilder.durable(SHIPPING_ORDER_CREATED_QUEUE)
                .withArgument("x-dead-letter-exchange", ORDERS_DLX)
                .withArgument("x-dead-letter-routing-key", DLX_ROUTING_KEY)
                .withArgument("x-message-ttl", 30000)
                .build();
    }

    @Bean
    public Queue shippingOrderCancelledQueue() {
        return QueueBuilder.durable(SHIPPING_ORDER_CANCELLED_QUEUE)
                .withArgument("x-dead-letter-exchange", ORDERS_DLX)
                .withArgument("x-dead-letter-routing-key", DLX_ROUTING_KEY)
                .withArgument("x-message-ttl", 30000)
                .build();
    }

    // Binding de la cola de pedidos confirmados (routing key "order.created").
    // Binding de la cola de pedidos cancelados (routing key "order.cancelled").
    @Bean
    public Binding shippingOrderCreatedBinding(Queue shippingOrderCreatedQueue, DirectExchange ordersExchange) {
        return BindingBuilder.bind(shippingOrderCreatedQueue)
                .to(ordersExchange)
                .with(ORDER_CREATED_ROUTING_KEY);
    }

    @Bean
    public Binding shippingOrderCancelledBinding(Queue shippingOrderCancelledQueue, DirectExchange ordersExchange) {
        return BindingBuilder.bind(shippingOrderCancelledQueue)
                .to(ordersExchange)
                .with(ORDER_CANCELLED_ROUTING_KEY);
    }

    // ========== TOPIC EXCHANGE (direct + topic exigidos por la pauta) ==========
    // Tercer destino de cada cola: el TopicExchange, con enrutamiento por patrón
    // "order.#". Demuestra el comodín '#' (cero o más palabras).
    @Bean
    public TopicExchange ordersTopicExchange() {
        return new TopicExchange(ORDERS_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public Binding shippingOrderCreatedTopicBinding(Queue shippingOrderCreatedQueue, TopicExchange ordersTopicExchange) {
        return BindingBuilder.bind(shippingOrderCreatedQueue)
                .to(ordersTopicExchange)
                .with("order.#");
    }

    @Bean
    public Binding shippingOrderCancelledTopicBinding(Queue shippingOrderCancelledQueue, TopicExchange ordersTopicExchange) {
        return BindingBuilder.bind(shippingOrderCancelledQueue)
                .to(ordersTopicExchange)
                .with("order.#");
    }

    // ========== DEAD LETTER EXCHANGE (DLX) y DEAD LETTER QUEUE (DLQ) ==========
    // DLX en modo FANOUT: ignora la routing key y entrega una copia del mensaje
    // muerto a TODAS las colas enlazadas (aquí solo la DLQ de shipping).
    // Durabilidad true: la definición sobrevive reinicios del broker.
    @Bean
    public FanoutExchange ordersDeadLetterExchange() {
        return new FanoutExchange(ORDERS_DLX, true, false);
    }

    // DLQ durable con TTL 24h (86400000 ms): política de retención del histórico
    // de mensajes fallidos (guía 2.2.3). Los mensajes muertos se conservan 24 h
    // y luego son descartados por RabbitMQ automáticamente.
    @Bean
    public Queue shippingDeadLetterQueue() {
        return QueueBuilder.durable(SHIPPING_DLQ)
                .withArgument("x-message-ttl", 86400000)
                .build();
    }

    // Enlaza la DLQ al DLX fanout: todo mensaje muerto llega aquí.
    @Bean
    public Binding shippingDeadLetterBinding(Queue shippingDeadLetterQueue, FanoutExchange ordersDeadLetterExchange) {
        return BindingBuilder.bind(shippingDeadLetterQueue)
                .to(ordersDeadLetterExchange);
    }

    // Conversor JSON compartido.
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}