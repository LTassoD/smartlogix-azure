package cl.duoc.smartlogix.analytics.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Foto de las metricas en un instante. Las de ventana cubren los ultimos
 * {@code windowSeconds}; las totales cubren desde que el servicio arranco.
 */
public record MetricsSnapshot(
        Instant generatedAt,
        int windowSeconds,
        long totalEvents,
        BigDecimal totalRevenue,
        double eventsPerSecond,
        long ordersInWindow,
        BigDecimal revenueInWindow,
        BigDecimal averageTicket,
        List<ProductStat> topProducts,
        Map<Integer, Long> eventsByPartition
) {
}
