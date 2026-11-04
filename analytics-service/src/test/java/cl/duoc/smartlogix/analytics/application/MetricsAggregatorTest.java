package cl.duoc.smartlogix.analytics.application;

import static org.junit.jupiter.api.Assertions.assertEquals;

import cl.duoc.smartlogix.analytics.domain.ItemSummary;
import cl.duoc.smartlogix.analytics.domain.OrderSummary;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MetricsAggregatorTest {

    private MutableClock clock;
    private MetricsAggregator aggregator;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-11-18T10:00:00Z"));
        aggregator = new MetricsAggregator(clock, 60);
    }

    @Test
    void pedidosFueraDeLaVentanaSeDescartan() {
        aggregator.record(pedido("ORD-1", 0, "10000", item("Mouse", 1, "10000")));
        clock.avanzar(Duration.ofSeconds(61));
        aggregator.record(pedido("ORD-2", 1, "5000", item("Mouse", 1, "5000")));

        var foto = aggregator.snapshot();

        assertEquals(1, foto.ordersInWindow());
        assertEquals(0, new BigDecimal("5000").compareTo(foto.revenueInWindow()));
        assertEquals(2, foto.totalEvents(), "el total no depende de la ventana");
        assertEquals(0, new BigDecimal("15000").compareTo(foto.totalRevenue()));
    }

    @Test
    void ticketPromedioSobreLaVentana() {
        aggregator.record(pedido("ORD-1", 0, "10000", item("Mouse", 1, "10000")));
        aggregator.record(pedido("ORD-2", 0, "20000", item("Teclado", 1, "20000")));

        var foto = aggregator.snapshot();

        assertEquals(0, new BigDecimal("15000.00").compareTo(foto.averageTicket()));
    }

    @Test
    void topProductosOrdenadoPorUnidades() {
        aggregator.record(pedido("ORD-1", 0, "30000",
                item("Mouse", 2, "10000"), item("Teclado", 1, "20000")));
        aggregator.record(pedido("ORD-2", 1, "10000", item("Mouse", 3, "10000")));

        var top = aggregator.snapshot().topProducts();

        assertEquals("Mouse", top.get(0).productName());
        assertEquals(5, top.get(0).units());
        assertEquals("Teclado", top.get(1).productName());
    }

    @Test
    void eventosPorParticion() {
        aggregator.record(pedido("ORD-1", 0, "1000", item("A", 1, "1000")));
        aggregator.record(pedido("ORD-2", 2, "1000", item("A", 1, "1000")));
        aggregator.record(pedido("ORD-3", 2, "1000", item("A", 1, "1000")));

        var particiones = aggregator.snapshot().eventsByPartition();

        assertEquals(1L, particiones.get(0));
        assertEquals(2L, particiones.get(2));
    }

    @Test
    void velocidadSoloCuentaLosUltimos10Segundos() {
        aggregator.record(pedido("ORD-1", 0, "1000", item("A", 1, "1000")));
        aggregator.record(pedido("ORD-2", 0, "1000", item("A", 1, "1000")));
        clock.avanzar(Duration.ofSeconds(11));
        aggregator.record(pedido("ORD-3", 0, "1000", item("A", 1, "1000")));

        assertEquals(0.1, aggregator.snapshot().eventsPerSecond(), 0.0001);
    }

    private static OrderSummary pedido(String numero, int particion, String total, ItemSummary... items) {
        return new OrderSummary(numero, particion, new BigDecimal(total), List.of(items));
    }

    private static ItemSummary item(String producto, int cantidad, String subtotal) {
        return new ItemSummary(producto, cantidad, new BigDecimal(subtotal));
    }

    /** Reloj manual: la prueba decide cuanto tiempo pasa. */
    private static final class MutableClock extends Clock {
        private Instant ahora;

        MutableClock(Instant inicio) {
            this.ahora = inicio;
        }

        void avanzar(Duration duracion) {
            ahora = ahora.plus(duracion);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }
}
