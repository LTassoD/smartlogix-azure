package cl.duoc.smartlogix.orders.infrastructure.messaging.publisher;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cl.duoc.smartlogix.orders.config.KafkaConfig;
import cl.duoc.smartlogix.orders.config.ServiceBusConfig;
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedEvent;
import cl.duoc.smartlogix.orders.infrastructure.messaging.event.OrderCreatedItemEvent;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

/**
 * Verifica el DUAL PUBLISH de la Fase 1 contra un Kafka REAL.
 *
 * El test usa un topic temporal y un {@link JmsTemplate} SIN ConnectionFactory:
 * asi se comprueba las dos cosas que importan de la integracion:
 *
 *   1. el evento llega a Kafka con key, headers y payload correctos;
 *   2. si Service Bus falla, el flujo NO se interrumpe (Kafka aguas abajo igual recibe).
 *
 * Si no hay broker en localhost:9092 el test se salta (no rompe el build ni el CI).
 */
class OrderEventPublisherKafkaTest {

    private static final String BOOTSTRAP =
            System.getenv().getOrDefault("SMARTLOGIX_KAFKA_BOOTSTRAP", "localhost:9092");

    private static final String TOPIC = "smartlogix.orders.events.test-" + UUID.randomUUID();

    private static AdminClient admin;

    @AfterAll
    static void borrarTopic() throws Exception {
        if (admin != null) {
            try {
                admin.deleteTopics(List.of(TOPIC)).all().get(15, TimeUnit.SECONDS);
            } catch (Exception ignored) {
                // El topic temporal puede quedar si el broker se detuvo: no afecta al resultado.
            }
            admin.close(Duration.ofSeconds(2));
        }
    }

    @Test
    void publicaEnKafkaAunqueServiceBusFalle() throws Exception {
        Map<String, Object> adminProps = Map.of(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP);
        admin = AdminClient.create(adminProps);

        String clusterId;
        try {
            clusterId = admin.describeCluster().clusterId().get(5, TimeUnit.SECONDS);
        } catch (Exception sinBroker) {
            Assumptions.abort("Kafka no esta disponible en " + BOOTSTRAP + ": se omite el test de integracion");
            return;
        }
        assertNotNull(clusterId);

        admin.createTopics(List.of(new NewTopic(TOPIC, Optional.of(1), Optional.of((short) 1))))
                .all().get(15, TimeUnit.SECONDS);

        KafkaTemplate<String, String> kafkaTemplate = crearKafkaTemplate();
        try {
            // Service Bus con un destino valido pero SIN ConnectionFactory: execute()
            // lanza IllegalStateException, que el publicador absorbe con un warning.
            ServiceBusConfig serviceBusConfig =
                    new ServiceBusConfig("localhost", "policy-test", "key-test");
            OrderEventPublisher publisher = new OrderEventPublisher(
                    new JmsTemplate(), JsonMapper.builder().build(), serviceBusConfig, kafkaTemplate);
            ReflectionTestUtils.setField(publisher, "kafkaTopic", TOPIC);
            ReflectionTestUtils.setField(publisher, "kafkaEnabled", true);

            OrderCreatedEvent evento = OrderCreatedEvent.builder()
                    .orderId(991L)
                    .orderNumber("ORD-20261118-00991")
                    .customerId(57L)
                    .totalAmount(new BigDecimal("24990.00"))
                    .createdAt(LocalDateTime.of(2026, 11, 18, 10, 30))
                    .items(List.of(OrderCreatedItemEvent.builder()
                            .productId(17L)
                            .warehouseId(2L)
                            .sku("HUB-017")
                            .productName("Hub USB 7 puertos")
                            .quantity(2)
                            .unitPrice(new BigDecimal("12495.00"))
                            .build()))
                    .build();

            publisher.publishOrderCreated(evento);
            // send() es asincrono: flush espera la confirmacion del broker.
            kafkaTemplate.flush();

            ConsumerRecord<String, String> record = leerPrimerMensaje();

            // Key = orderNumber -> todas las versiones del pedido caen en la misma particion.
            assertEquals("ORD-20261118-00991", record.key());
            // Headers equivalentes a las propiedades JMS de Service Bus.
            assertEquals("order.created", header(record, KafkaConfig.EVENT_TYPE_HEADER));
            assertEquals("ORD-20261118-00991", header(record, KafkaConfig.ORDER_NUMBER_HEADER));
            assertEquals(KafkaConfig.SOURCE_VALUE, header(record, KafkaConfig.SOURCE_HEADER));
            // Mismo payload que viaja a Service Bus.
            assertTrue(record.value().contains("\"orderNumber\":\"ORD-20261118-00991\""),
                    () -> "payload sin orderNumber: " + record.value());
            assertTrue(record.value().contains("\"totalAmount\":24990.00"),
                    () -> "payload sin totalAmount: " + record.value());
            assertTrue(record.value().contains("\"productName\":\"Hub USB 7 puertos\""),
                    () -> "payload sin items: " + record.value());
        } finally {
            kafkaTemplate.destroy();
        }
    }

    private static KafkaTemplate<String, String> crearKafkaTemplate() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);

        KafkaTemplate<String, String> template =
                new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(props));
        template.setDefaultTopic(TOPIC);
        return template;
    }

    private static ConsumerRecord<String, String> leerPrimerMensaje() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "test-dual-publish-" + UUID.randomUUID());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        try (Consumer<String, String> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(List.of(TOPIC));
            long limite = System.currentTimeMillis() + 30_000;
            while (System.currentTimeMillis() < limite) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
                for (ConsumerRecord<String, String> record : records) {
                    return record;
                }
            }
        }
        throw new AssertionError("No llego ningun mensaje al topic " + TOPIC + " en 30 s");
    }

    private static String header(ConsumerRecord<String, String> record, String nombre) {
        Header header = record.headers().lastHeader(nombre);
        assertNotNull(header, () -> "falta el header " + nombre);
        return new String(header.value(), java.nio.charset.StandardCharsets.UTF_8);
    }
}
