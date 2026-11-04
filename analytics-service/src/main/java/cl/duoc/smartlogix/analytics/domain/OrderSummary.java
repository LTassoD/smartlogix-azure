package cl.duoc.smartlogix.analytics.domain;

import java.math.BigDecimal;
import java.util.List;

/** Resumen de un pedido confirmado, extraido del evento order.created de Kafka. */
public record OrderSummary(
        String orderNumber,
        int partition,
        BigDecimal total,
        List<ItemSummary> items
) {
}
