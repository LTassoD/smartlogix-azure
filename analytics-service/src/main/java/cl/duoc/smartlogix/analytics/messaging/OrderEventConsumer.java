package cl.duoc.smartlogix.analytics.messaging;

import cl.duoc.smartlogix.analytics.application.MetricsAggregator;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consume el topic de pedidos. El consumer group sale de application.properties
 * (smartlogix-analytics) y cada evento alimenta el agregador de la ventana.
 */
@Slf4j
@Component
public class OrderEventConsumer {

    private final OrderEventParser parser;
    private final MetricsAggregator aggregator;

    public OrderEventConsumer(OrderEventParser parser, MetricsAggregator aggregator) {
        this.parser = parser;
        this.aggregator = aggregator;
    }

    @KafkaListener(topics = "${smartlogix.kafka.orders-topic}")
    public void onOrderEvent(ConsumerRecord<String, String> record) {
        parser.parse(record.value(), record.partition()).ifPresentOrElse(
                aggregator::record,
                () -> log.debug("Mensaje descartado: offset={}", record.offset()));
    }
}
