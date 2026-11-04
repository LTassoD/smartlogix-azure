package cl.duoc.smartlogix.analytics.application;

import cl.duoc.smartlogix.analytics.domain.ItemSummary;
import cl.duoc.smartlogix.analytics.domain.MetricsSnapshot;
import cl.duoc.smartlogix.analytics.domain.OrderSummary;
import cl.duoc.smartlogix.analytics.domain.ProductStat;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Agregador con ventana deslizante. Guarda los pedidos de los ultimos
 * {@code window-seconds} segun su hora de llegada y calcula las metricas al vuelo.
 *
 * El reloj se inyecta para poder probar la expiracion de la ventana sin esperar.
 */
@Component
public class MetricsAggregator {

    private static final Duration RATE_WINDOW = Duration.ofSeconds(10);
    private static final int TOP_PRODUCTS = 5;

    private record Arrival(Instant at, OrderSummary order) {
    }

    private final Clock clock;
    private final Duration window;
    private final Deque<Arrival> arrivals = new ArrayDeque<>();
    private final Map<Integer, Long> eventsByPartition = new TreeMap<>();
    private long totalEvents;
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    public MetricsAggregator(Clock clock,
                             @Value("${smartlogix.analytics.window-seconds:60}") long windowSeconds) {
        this.clock = clock;
        this.window = Duration.ofSeconds(windowSeconds);
    }

    public synchronized void record(OrderSummary order) {
        Instant now = clock.instant();
        arrivals.addLast(new Arrival(now, order));
        eventsByPartition.merge(order.partition(), 1L, Long::sum);
        totalEvents++;
        totalRevenue = totalRevenue.add(order.total());
        evictExpired(now);
    }

    public synchronized MetricsSnapshot snapshot() {
        Instant now = clock.instant();
        evictExpired(now);

        long ordersInWindow = arrivals.size();
        BigDecimal revenueInWindow = BigDecimal.ZERO;
        Map<String, ProductStat> products = new HashMap<>();
        for (Arrival arrival : arrivals) {
            revenueInWindow = revenueInWindow.add(arrival.order().total());
            for (ItemSummary item : arrival.order().items()) {
                products.merge(item.productName(),
                        new ProductStat(item.productName(), item.quantity(), item.subtotal()),
                        (a, b) -> new ProductStat(a.productName(), a.units() + b.units(),
                                a.revenue().add(b.revenue())));
            }
        }

        List<ProductStat> topProducts = products.values().stream()
                .sorted(Comparator.comparingLong(ProductStat::units).reversed()
                        .thenComparing(ProductStat::revenue, Comparator.reverseOrder()))
                .limit(TOP_PRODUCTS)
                .toList();

        return new MetricsSnapshot(
                now,
                (int) window.toSeconds(),
                totalEvents,
                totalRevenue,
                eventsPerSecond(now),
                ordersInWindow,
                revenueInWindow,
                averageTicket(revenueInWindow, ordersInWindow),
                new ArrayList<>(topProducts),
                Map.copyOf(eventsByPartition)
        );
    }

    private void evictExpired(Instant now) {
        Instant limite = now.minus(window);
        while (!arrivals.isEmpty() && arrivals.peekFirst().at().isBefore(limite)) {
            arrivals.pollFirst();
        }
    }

    private double eventsPerSecond(Instant now) {
        Instant desde = now.minus(RATE_WINDOW);
        long recientes = arrivals.stream().filter(a -> !a.at().isBefore(desde)).count();
        return recientes / (double) RATE_WINDOW.toSeconds();
    }

    private static BigDecimal averageTicket(BigDecimal revenue, long orders) {
        if (orders == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return revenue.divide(BigDecimal.valueOf(orders), 2, RoundingMode.HALF_UP);
    }
}
